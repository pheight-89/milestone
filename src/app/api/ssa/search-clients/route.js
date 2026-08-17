import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "ssa") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return Response.json({ clients: [] }, { status: 200 });
  }

  const { data: counties, error: countiesError } = await supabaseAdmin
    .from("counties")
    .select("id")
    .eq("county_board_org_id", user.org_id);

  if (countiesError) {
    return Response.json({ error: countiesError.message }, { status: 500 });
  }

  const countyIds = counties.map((c) => c.id);
  if (countyIds.length === 0) {
    return Response.json({ clients: [] }, { status: 200 });
  }

  const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
    .from("org_counties")
    .select("org_id")
    .in("county_id", countyIds);

  if (orgCountiesError) {
    return Response.json({ error: orgCountiesError.message }, { status: 500 });
  }

  const providerOrgIds = [
    ...new Set((orgCounties || []).map((oc) => oc.org_id)),
  ];
  if (providerOrgIds.length === 0) {
    return Response.json({ clients: [] }, { status: 200 });
  }

  const { data: registrations, error: regError } = await supabaseAdmin
    .from("registrations")
    .select("client_profile_id")
    .in("org_id", providerOrgIds);

  if (regError) {
    return Response.json({ error: regError.message }, { status: 500 });
  }

  const clientProfileIds = [
    ...new Set((registrations || []).map((r) => r.client_profile_id)),
  ];
  if (clientProfileIds.length === 0) {
    return Response.json({ clients: [] }, { status: 200 });
  }

  // Strip characters with special meaning in PostgREST's filter syntax
  // before interpolating user input into the .or() filter string.
  const sanitizedQ = q.replace(/[,()]/g, "");

  const { data: clients, error: clientsError } = await supabaseAdmin
    .from("client_profiles")
    .select("id, first_name, last_name, date_of_birth")
    .in("id", clientProfileIds)
    .or(`first_name.ilike.%${sanitizedQ}%,last_name.ilike.%${sanitizedQ}%`);

  if (clientsError) {
    return Response.json({ error: clientsError.message }, { status: 500 });
  }

  return Response.json({ clients }, { status: 200 });
}
