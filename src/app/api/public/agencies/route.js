import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const countyId = searchParams.get("county_id");

  let orgIds = null;

  if (countyId) {
    const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
      .from("org_counties")
      .select("org_id")
      .eq("county_id", countyId);

    if (orgCountiesError) {
      return Response.json({ error: orgCountiesError.message }, { status: 500 });
    }

    orgIds = [...new Set(orgCounties.map((oc) => oc.org_id))];

    if (orgIds.length === 0) {
      return Response.json({ agencies: [] }, { status: 200 });
    }
  }

  let query = supabaseAdmin
    .from("organizations")
    .select("id, name, slug")
    .eq("org_type", "provider")
    .order("name", { ascending: true });

  if (orgIds) {
    query = query.in("id", orgIds);
  }

  const { data: orgs, error: orgsError } = await query;

  if (orgsError) {
    return Response.json({ error: orgsError.message }, { status: 500 });
  }

  const orgIdList = orgs.map((org) => org.id);
  const countsByOrg = new Map();

  if (orgIdList.length > 0) {
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("events")
      .select("org_id")
      .in("org_id", orgIdList)
      .gte("date", new Date().toISOString());

    if (eventsError) {
      return Response.json({ error: eventsError.message }, { status: 500 });
    }

    for (const event of events) {
      countsByOrg.set(event.org_id, (countsByOrg.get(event.org_id) || 0) + 1);
    }
  }

  const agencies = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    upcoming_event_count: countsByOrg.get(org.id) || 0,
  }));

  return Response.json({ agencies }, { status: 200 });
}
