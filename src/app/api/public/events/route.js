import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const countyId = searchParams.get("county_id");
  const search = (searchParams.get("search") || "").trim();

  let orgIds = null;

  if (countyId) {
    const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
      .from("org_counties")
      .select("org_id")
      .eq("county_id", countyId);

    if (orgCountiesError) {
      return Response.json({ error: orgCountiesError.message }, { status: 500 });
    }

    orgIds = [...new Set((orgCounties || []).map((oc) => oc.org_id))];

    if (orgIds.length === 0) {
      return Response.json({ events: [] }, { status: 200 });
    }
  }

  let query = supabaseAdmin
    .from("events")
    .select(
      "id, title, description, date, location, capacity, cost, org_id, organizations(name, slug)",
    )
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true });

  if (orgIds) {
    query = query.in("org_id", orgIds);
  }

  if (search) {
    // Strip characters with special meaning in PostgREST's filter syntax
    // before interpolating user input into the .or() filter string.
    const sanitizedSearch = search.replace(/[,()]/g, "");
    query = query.or(
      `title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`,
    );
  }

  const { data: events, error: eventsError } = await query;

  if (eventsError) {
    return Response.json({ error: eventsError.message }, { status: 500 });
  }

  const data = events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    location: event.location,
    capacity: event.capacity,
    cost: event.cost,
    org_name: event.organizations?.name,
    org_slug: event.organizations?.slug,
  }));

  return Response.json({ events: data }, { status: 200 });
}
