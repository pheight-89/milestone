import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.org_type !== "county_board" || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: counties, error: countiesError } = await supabaseAdmin
    .from("counties")
    .select("id, name, state")
    .eq("county_board_org_id", user.org_id);

  if (countiesError) {
    return Response.json({ error: countiesError.message }, { status: 500 });
  }

  const countyIds = counties.map((c) => c.id);
  let orgs = [];

  if (countyIds.length > 0) {
    const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
      .from("org_counties")
      .select("id, county_id, organizations(id, name, slug)")
      .in("county_id", countyIds);

    if (orgCountiesError) {
      return Response.json({ error: orgCountiesError.message }, { status: 500 });
    }

    orgs = orgCounties.map((oc) => ({
      link_id: oc.id,
      org_id: oc.organizations?.id,
      org_name: oc.organizations?.name,
      org_slug: oc.organizations?.slug,
      county_id: oc.county_id,
    }));
  }

  const { data: ssas, error: ssasError } = await supabaseAdmin
    .from("org_staff")
    .select("id, email, role, created_at")
    .eq("org_id", user.org_id)
    .eq("role", "ssa");

  if (ssasError) {
    return Response.json({ error: ssasError.message }, { status: 500 });
  }

  const ssaIds = ssas.map((s) => s.id);
  let caseloadCounts = new Map();
  let totalCaseload = 0;

  if (ssaIds.length > 0) {
    const { data: caseload, error: caseloadError } = await supabaseAdmin
      .from("ssa_caseload")
      .select("ssa_staff_id")
      .in("ssa_staff_id", ssaIds);

    if (caseloadError) {
      return Response.json({ error: caseloadError.message }, { status: 500 });
    }

    totalCaseload = caseload.length;
    caseloadCounts = caseload.reduce((map, c) => {
      map.set(c.ssa_staff_id, (map.get(c.ssa_staff_id) || 0) + 1);
      return map;
    }, new Map());
  }

  const ssaData = ssas.map((s) => ({
    id: s.id,
    email: s.email,
    role: s.role,
    created_at: s.created_at,
    caseload_count: caseloadCounts.get(s.id) || 0,
  }));

  return Response.json(
    {
      counties,
      orgs,
      ssas: ssaData,
      total_caseload: totalCaseload,
    },
    { status: 200 },
  );
}
