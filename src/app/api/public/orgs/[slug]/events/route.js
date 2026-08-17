import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { slug } = await params;

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();

  if (orgError || !org) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: events, error: eventsError } = await supabaseAdmin
    .from("events")
    .select("id, title, description, location, date, capacity, cost")
    .eq("org_id", org.id)
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true });

  if (eventsError) {
    return Response.json({ error: eventsError.message }, { status: 500 });
  }

  const eventIds = events.map((event) => event.id);
  let countsByEvent = new Map();

  if (eventIds.length > 0) {
    const { data: registrations } = await supabaseAdmin
      .from("registrations")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "confirmed");

    countsByEvent = (registrations || []).reduce((map, registration) => {
      map.set(registration.event_id, (map.get(registration.event_id) || 0) + 1);
      return map;
    }, new Map());
  }

  const data = events.map((event) => ({
    ...event,
    registered_count: countsByEvent.get(event.id) || 0,
  }));

  return Response.json({ events: data }, { status: 200 });
}
