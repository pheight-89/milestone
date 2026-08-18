import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: events, error: eventsError } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("org_id", user.org_id)
    .order("date", { ascending: true });

  if (eventsError) {
    return Response.json({ error: eventsError.message }, { status: 500 });
  }

  return Response.json({ data: events }, { status: 200 });
}

export async function POST(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const body = await request.json();
  const { title, description, location, date, capacity, cost } = body;

  if (!title || !date || !capacity) {
    return Response.json(
      { error: "Title, Date, and Capacity are required." },
      { status: 400 },
    );
  }

  const { data: event, error: eventsError } = await supabaseAdmin
    .from("events")
    .insert({
      title,
      description,
      location,
      date,
      capacity,
      cost: cost || 0,
      org_id: user.org_id,
      created_by: user.staff_id,
    })
    .select()
    .single();

  if (eventsError) {
    return Response.json({ error: eventsError.message }, { status: 500 });
  }

  return Response.json({ data: event }, { status: 201 });
}
