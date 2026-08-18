import "server-only";
import { getFamilyAuth, getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const { family, error } = await getFamilyAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { event_id, org_id, registrations } = await request.json();

  if (
    !event_id ||
    !org_id ||
    !Array.isArray(registrations) ||
    registrations.length === 0
  ) {
    return Response.json(
      {
        error:
          "event_id, org_id, and at least one registration are required",
      },
      { status: 400 },
    );
  }

  const clientProfileIds = registrations.map((r) => r.client_profile_id);

  const { data: ownedProfiles, error: profilesError } = await supabaseAdmin
    .from("client_profiles")
    .select("id")
    .eq("family_account_id", family.id)
    .in("id", clientProfileIds);

  if (profilesError) {
    return Response.json({ error: profilesError.message }, { status: 500 });
  }

  const ownedIds = new Set(ownedProfiles.map((p) => p.id));
  const validRegistrations = registrations.filter((r) =>
    ownedIds.has(r.client_profile_id),
  );

  if (validRegistrations.length === 0) {
    return Response.json(
      { error: "No valid client profiles for this family account" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("registrations")
    .select("client_profile_id")
    .eq("event_id", event_id)
    .in(
      "client_profile_id",
      validRegistrations.map((r) => r.client_profile_id),
    );

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 });
  }

  const alreadyRegisteredIds = new Set(
    existing.map((r) => r.client_profile_id),
  );

  const created = [];
  const skipped = validRegistrations
    .filter((r) => alreadyRegisteredIds.has(r.client_profile_id))
    .map((r) => r.client_profile_id);

  // Requires client_county_associations table — see SQL migration.
  const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
    .from("org_counties")
    .select("county_id")
    .eq("org_id", org_id);

  if (orgCountiesError) {
    return Response.json({ error: orgCountiesError.message }, { status: 500 });
  }

  const countyIds = [...new Set(orgCounties.map((oc) => oc.county_id))];

  for (const reg of validRegistrations) {
    if (alreadyRegisteredIds.has(reg.client_profile_id)) continue;

    const paymentType =
      reg.payment_type === "self_pay" ? "self_pay" : "funded";

    const { data: registration, error: insertError } = await supabaseAdmin
      .from("registrations")
      .insert({
        event_id,
        org_id,
        client_profile_id: reg.client_profile_id,
        family_account_id: family.id,
        status: "pending",
        payment_type: paymentType,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        skipped.push(reg.client_profile_id);
        continue;
      }
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    created.push(registration);

    await supabaseAdmin.from("client_org_profiles").upsert(
      {
        client_profile_id: reg.client_profile_id,
        org_id,
        custom_values: reg.custom_values || {},
        last_confirmed_at: new Date().toISOString(),
      },
      { onConflict: "client_profile_id,org_id" },
    );

    // Requires client_county_associations table — see SQL migration.
    if (countyIds.length > 0) {
      await supabaseAdmin.from("client_county_associations").upsert(
        countyIds.map((countyId) => ({
          client_profile_id: reg.client_profile_id,
          county_id: countyId,
        })),
        { onConflict: "client_profile_id,county_id", ignoreDuplicates: true },
      );
    }
  }

  // TODO: send a "registration pending" email to the family via a
  // transactional email provider (Resend, Postmark, etc). Supabase Auth's
  // built-in email templates are meant for auth flows, not arbitrary
  // notifications, so this needs a separate integration in a later sprint.

  return Response.json({ created, skipped }, { status: 201 });
}

export async function GET(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id");

  if (!eventId) {
    return Response.json({ error: "event_id is required" }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("org_id", user.org_id)
    .single();

  if (eventError || !event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: registrations, error: regError } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, status, created_at, payment_type, client_profile_id, client_profiles(first_name, last_name, support_needs, allergies)",
    )
    .eq("event_id", eventId)
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: true });

  if (regError) {
    return Response.json({ error: regError.message }, { status: 500 });
  }

  const clientProfileIds = registrations.map((r) => r.client_profile_id);
  let customValuesByProfile = new Map();

  if (clientProfileIds.length > 0) {
    const { data: orgProfiles } = await supabaseAdmin
      .from("client_org_profiles")
      .select("client_profile_id, custom_values")
      .eq("org_id", user.org_id)
      .in("client_profile_id", clientProfileIds);

    customValuesByProfile = new Map(
      (orgProfiles || []).map((p) => [p.client_profile_id, p.custom_values]),
    );
  }

  const data = registrations.map((r) => ({
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    payment_type: r.payment_type,
    first_name: r.client_profiles?.first_name,
    last_name: r.client_profiles?.last_name,
    support_needs: r.client_profiles?.support_needs,
    allergies: r.client_profiles?.allergies,
    custom_values: customValuesByProfile.get(r.client_profile_id) || {},
  }));

  return Response.json({ registrations: data }, { status: 200 });
}
