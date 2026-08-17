import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "ssa") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: caseloadEntry, error: caseloadError } = await supabaseAdmin
    .from("ssa_caseload")
    .select("id, client_profile_id")
    .eq("id", id)
    .eq("ssa_staff_id", user.staff_id)
    .single();

  if (caseloadError || !caseloadEntry) {
    return Response.json(
      { error: "Caseload entry not found" },
      { status: 404 },
    );
  }

  const { data: counties, error: countiesError } = await supabaseAdmin
    .from("counties")
    .select("id")
    .eq("county_board_org_id", user.org_id);

  if (countiesError) {
    return Response.json({ error: countiesError.message }, { status: 500 });
  }

  const countyIds = counties.map((c) => c.id);
  let providerOrgIds = [];

  if (countyIds.length > 0) {
    const { data: orgCounties } = await supabaseAdmin
      .from("org_counties")
      .select("org_id")
      .in("county_id", countyIds);
    providerOrgIds = [...new Set((orgCounties || []).map((oc) => oc.org_id))];
  }

  let registrations = [];

  if (providerOrgIds.length > 0) {
    const { data, error: regError } = await supabaseAdmin
      .from("registrations")
      .select(
        "id, status, created_at, events(title, date, cost), organizations(name)",
      )
      .eq("client_profile_id", caseloadEntry.client_profile_id)
      .in("org_id", providerOrgIds);

    if (regError) {
      return Response.json({ error: regError.message }, { status: 500 });
    }

    registrations = (data || []).map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      event_title: r.events?.title,
      event_date: r.events?.date,
      event_cost: r.events?.cost,
      org_name: r.organizations?.name,
    }));
  }

  await supabaseAdmin.from("ssa_access_log").insert({
    ssa_staff_id: user.staff_id,
    client_profile_id: caseloadEntry.client_profile_id,
    action: "viewed_registrations",
  });

  return Response.json({ registrations }, { status: 200 });
}
