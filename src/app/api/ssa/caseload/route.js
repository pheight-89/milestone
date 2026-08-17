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

export async function GET() {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "ssa") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { providerOrgIds, error: orgsError } = await getProviderOrgIdsForCounty(
    user.org_id,
  );
  if (orgsError) {
    return Response.json({ error: orgsError.message }, { status: 500 });
  }

  const { data: caseload, error: caseloadError } = await supabaseAdmin
    .from("ssa_caseload")
    .select(
      "id, span_start, span_end, client_profile_id, client_profiles(first_name, last_name, date_of_birth)",
    )
    .eq("ssa_staff_id", user.staff_id)
    .order("created_at", { ascending: true });

  if (caseloadError) {
    return Response.json({ error: caseloadError.message }, { status: 500 });
  }

  const clientProfileIds = caseload.map((c) => c.client_profile_id);
  const registrationsByClient = new Map();

  if (clientProfileIds.length > 0 && providerOrgIds.length > 0) {
    const { data: registrations, error: regError } = await supabaseAdmin
      .from("registrations")
      .select(
        "id, status, client_profile_id, events(title, date, cost), organizations(name)",
      )
      .in("client_profile_id", clientProfileIds)
      .in("org_id", providerOrgIds);

    if (regError) {
      return Response.json({ error: regError.message }, { status: 500 });
    }

    for (const reg of registrations || []) {
      const list = registrationsByClient.get(reg.client_profile_id) || [];
      list.push({
        id: reg.id,
        status: reg.status,
        event_title: reg.events?.title,
        event_date: reg.events?.date,
        event_cost: reg.events?.cost,
        org_name: reg.organizations?.name,
      });
      registrationsByClient.set(reg.client_profile_id, list);
    }
  }

  const data = caseload.map((c) => ({
    id: c.id,
    span_start: c.span_start,
    span_end: c.span_end,
    client_profile: {
      id: c.client_profile_id,
      first_name: c.client_profiles?.first_name,
      last_name: c.client_profiles?.last_name,
      date_of_birth: c.client_profiles?.date_of_birth,
    },
    registrations: registrationsByClient.get(c.client_profile_id) || [],
  }));

  if (clientProfileIds.length > 0) {
    await supabaseAdmin.from("ssa_access_log").insert(
      clientProfileIds.map((clientProfileId) => ({
        ssa_staff_id: user.staff_id,
        client_profile_id: clientProfileId,
        action: "viewed_caseload",
      })),
    );
  }

  return Response.json({ caseload: data }, { status: 200 });
}

export async function POST(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "ssa") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { client_profile_id, span_start, span_end } = await request.json();

  if (!client_profile_id || !span_start || !span_end) {
    return Response.json(
      { error: "client_profile_id, span_start, and span_end are required" },
      { status: 400 },
    );
  }

  const { providerOrgIds, error: orgsError } = await getProviderOrgIdsForCounty(
    user.org_id,
  );
  if (orgsError) {
    return Response.json({ error: orgsError.message }, { status: 500 });
  }

  if (providerOrgIds.length === 0) {
    return Response.json(
      {
        error:
          "This individual is not registered with any organization in your county",
      },
      { status: 400 },
    );
  }

  const { data: registration } = await supabaseAdmin
    .from("registrations")
    .select("id")
    .eq("client_profile_id", client_profile_id)
    .in("org_id", providerOrgIds)
    .limit(1)
    .maybeSingle();

  if (!registration) {
    return Response.json(
      {
        error:
          "This individual is not registered with any organization in your county",
      },
      { status: 400 },
    );
  }

  const { data: caseloadEntry, error: insertError } = await supabaseAdmin
    .from("ssa_caseload")
    .insert({
      ssa_staff_id: user.staff_id,
      client_profile_id,
      span_start,
      span_end,
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  await supabaseAdmin.from("ssa_access_log").insert({
    ssa_staff_id: user.staff_id,
    client_profile_id,
    action: "added_to_caseload",
  });

  return Response.json({ caseload: caseloadEntry }, { status: 201 });
}
