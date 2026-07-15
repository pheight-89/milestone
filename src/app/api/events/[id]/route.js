import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth(request);
  if (error) return Response.json({ error }, { status: 401 });

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("org_id", user.org_id)
    .single();

  if (eventError) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  return Response.json({ data: event }, { status: 200 });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth(request);
  if (error) return Response.json({ error }, { status: 401 });

  const body = await request.json();
  const { title, description, location, date, capacity } = body;
  //if user deletes something and does not add a value
  if (!title || !date || !capacity) {
    return Response.json(
      { error: "Title, Date, and Capacity are reqruied." },
      { status: 400 },
    );
  }
  //update the table in supabase
  const { data: events, error: eventsError } = await supabaseAdmin
    .from("events")
    .update({ title, description, location, date, capacity })
    .eq("id", id)
    .eq("org_id", user.org_id)
    .select()
    .single();

  if (eventsError) {
    return Response.json({ error: eventsError.message }, { status: 500 });
  }

  return Response.json({ data: events }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth(request);
  if (error) return Response.json({ error }, { status: 401 });
  const { error: deleteError } = await supabaseAdmin
    .from("events")
    .delete()
    .eq("id", id)
    .eq("org_id", user.org_id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}
