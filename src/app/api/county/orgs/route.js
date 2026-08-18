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
    .select("id")
    .eq("county_board_org_id", user.org_id);

  if (countiesError) {
    return Response.json({ error: countiesError.message }, { status: 500 });
  }

  const countyIds = counties.map((c) => c.id);

  if (countyIds.length === 0) {
    return Response.json({ orgs: [] }, { status: 200 });
  }

  const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
    .from("org_counties")
    .select("id, county_id, counties(name), organizations(id, name, slug)")
    .in("county_id", countyIds);

  if (orgCountiesError) {
    return Response.json({ error: orgCountiesError.message }, { status: 500 });
  }

  const orgs = orgCounties.map((oc) => ({
    link_id: oc.id,
    org_id: oc.organizations?.id,
    org_name: oc.organizations?.name,
    org_slug: oc.organizations?.slug,
    county_id: oc.county_id,
    county_name: oc.counties?.name,
  }));

  return Response.json({ orgs }, { status: 200 });
}

export async function POST(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { org_id, county_id } = await request.json();

  if (!org_id || !county_id) {
    return Response.json(
      { error: "org_id and county_id are required" },
      { status: 400 },
    );
  }

  const isCountyBoardAdmin =
    user.org_type === "county_board" && user.role === "admin";
  const isSelfServiceProviderAdmin =
    user.org_type === "provider" &&
    user.role === "admin" &&
    org_id === user.org_id;

  if (!isCountyBoardAdmin && !isSelfServiceProviderAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isCountyBoardAdmin) {
    const { data: county, error: countyError } = await supabaseAdmin
      .from("counties")
      .select("id")
      .eq("id", county_id)
      .eq("county_board_org_id", user.org_id)
      .single();

    if (countyError || !county) {
      return Response.json(
        { error: "County not found for this county board" },
        { status: 404 },
      );
    }
  } else {
    const { data: county, error: countyError } = await supabaseAdmin
      .from("counties")
      .select("id")
      .eq("id", county_id)
      .single();

    if (countyError || !county) {
      return Response.json({ error: "County not found" }, { status: 404 });
    }
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .select("id, org_type")
    .eq("id", org_id)
    .single();

  if (orgError || !org) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.org_type !== "provider") {
    return Response.json(
      { error: "Only provider organizations can be linked to a county" },
      { status: 400 },
    );
  }

  const { data: link, error: linkError } = await supabaseAdmin
    .from("org_counties")
    .insert({ org_id, county_id })
    .select()
    .single();

  if (linkError) {
    if (linkError.code === "23505") {
      return Response.json(
        { error: "This organization is already linked to that county" },
        { status: 409 },
      );
    }
    return Response.json({ error: linkError.message }, { status: 500 });
  }

  return Response.json({ link }, { status: 201 });
}
