import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getProviderOrgIdsForCounty(orgId) {
  const { data: counties, error: countiesError } = await supabaseAdmin
    .from("counties")
    .select("id")
    .eq("county_board_org_id", orgId);

  if (countiesError) return { providerOrgIds: null, error: countiesError };

  const countyIds = counties.map((c) => c.id);
  if (countyIds.length === 0) return { providerOrgIds: [], error: null };

  const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
    .from("org_counties")
    .select("org_id")
    .in("county_id", countyIds);

  if (orgCountiesError) return { providerOrgIds: null, error: orgCountiesError };

  return {
    providerOrgIds: [...new Set((orgCounties || []).map((oc) => oc.org_id))],
    error: null,
  };
}

async function assertOnCaseload(staffId, clientProfileId) {
  const { data: caseloadEntries, error } = await supabaseAdmin
    .from("ssa_caseload")
    .select("id, span_start, span_end")
    .eq("ssa_staff_id", staffId)
    .eq("client_profile_id", clientProfileId)
    .order("span_start", { ascending: true });

  if (error) return { caseloadEntries: null, error };
  if (!caseloadEntries || caseloadEntries.length === 0) {
    return { caseloadEntries: [], error: null, forbidden: true };
  }

  return { caseloadEntries, error: null, forbidden: false };
}

export async function GET(request, { params }) {
  const { id: clientProfileId } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "ssa") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    caseloadEntries,
    error: caseloadError,
    forbidden,
  } = await assertOnCaseload(user.staff_id, clientProfileId);

  if (caseloadError) {
    return Response.json({ error: caseloadError.message }, { status: 500 });
  }

  if (forbidden) {
    return Response.json(
      { error: "This individual is not on your caseload" },
      { status: 403 },
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("client_profiles")
    .select("*")
    .eq("id", clientProfileId)
    .single();

  if (profileError || !profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  const { providerOrgIds, error: orgsError } =
    await getProviderOrgIdsForCounty(user.org_id);

  if (orgsError) {
    return Response.json({ error: orgsError.message }, { status: 500 });
  }

  let registrations = [];

  if (providerOrgIds.length > 0) {
    const { data: regs, error: regError } = await supabaseAdmin
      .from("registrations")
      .select(
        "id, status, payment_type, events(title, date, cost), organizations(name)",
      )
      .eq("client_profile_id", clientProfileId)
      .in("org_id", providerOrgIds);

    if (regError) {
      return Response.json({ error: regError.message }, { status: 500 });
    }

    const registrationIds = (regs || []).map((r) => r.id);
    const billingByRegistration = new Map();

    if (registrationIds.length > 0) {
      const { data: billingRows } = await supabaseAdmin
        .from("registration_billing")
        .select("registration_id, code, description, rate, is_addon")
        .in("registration_id", registrationIds);

      for (const row of billingRows || []) {
        const list = billingByRegistration.get(row.registration_id) || [];
        list.push({
          code: row.code,
          description: row.description,
          rate: row.rate,
          is_addon: row.is_addon,
        });
        billingByRegistration.set(row.registration_id, list);
      }
    }

    registrations = (regs || []).map((reg) => {
      const billing = billingByRegistration.get(reg.id) || [];
      return {
        id: reg.id,
        status: reg.status,
        payment_type: reg.payment_type,
        event_title: reg.events?.title,
        event_date: reg.events?.date,
        event_cost: reg.events?.cost,
        org_name: reg.organizations?.name,
        billing_codes: billing,
        billing_total: billing.reduce((sum, b) => sum + Number(b.rate), 0),
      };
    });
  }

  const { data: countyAssociations, error: countyError } = await supabaseAdmin
    .from("client_county_associations")
    .select("county_id, counties(name, state)")
    .eq("client_profile_id", clientProfileId);

  if (countyError) {
    return Response.json({ error: countyError.message }, { status: 500 });
  }

  await supabaseAdmin.from("ssa_access_log").insert({
    ssa_staff_id: user.staff_id,
    client_profile_id: clientProfileId,
    action: "viewed_profile",
  });

  return Response.json(
    {
      profile,
      caseload: caseloadEntries,
      registrations,
      county_associations: (countyAssociations || []).map((ca) => ({
        county_id: ca.county_id,
        county_name: ca.counties?.name,
        state: ca.counties?.state,
      })),
    },
    { status: 200 },
  );
}

export async function PATCH(request, { params }) {
  const { id: clientProfileId } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "ssa") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { forbidden, error: caseloadError } = await assertOnCaseload(
    user.staff_id,
    clientProfileId,
  );

  if (caseloadError) {
    return Response.json({ error: caseloadError.message }, { status: 500 });
  }

  if (forbidden) {
    return Response.json(
      { error: "This individual is not on your caseload" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const {
    first_name,
    last_name,
    date_of_birth,
    primary_phone,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    support_needs,
    allergies,
    notes,
  } = body;

  if (!first_name || !last_name) {
    return Response.json(
      { error: "First name and last name are required" },
      { status: 400 },
    );
  }

  const { data: profile, error: updateError } = await supabaseAdmin
    .from("client_profiles")
    .update({
      first_name,
      last_name,
      date_of_birth: date_of_birth || null,
      primary_phone: primary_phone || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      emergency_contact_relationship: emergency_contact_relationship || null,
      support_needs: support_needs || null,
      allergies: allergies || null,
      notes: notes || null,
    })
    .eq("id", clientProfileId)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("ssa_access_log").insert({
    ssa_staff_id: user.staff_id,
    client_profile_id: clientProfileId,
    action: "updated_profile",
  });

  return Response.json({ profile }, { status: 200 });
}
