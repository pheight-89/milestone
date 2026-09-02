import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("id", id)
    .eq("org_id", user.org_id)
    .single();

  if (eventError || !event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: eventRegistrations, error: regIdsError } = await supabaseAdmin
    .from("registrations")
    .select("id")
    .eq("event_id", id)
    .eq("org_id", user.org_id);

  if (regIdsError) {
    return Response.json({ error: regIdsError.message }, { status: 500 });
  }

  const registrationIds = eventRegistrations.map((r) => r.id);

  if (registrationIds.length === 0) {
    return Response.json({ entries: [] }, { status: 200 });
  }

  const { data: entries, error: entriesError } = await supabaseAdmin
    .from("registration_audit_log")
    .select(
      `
      id, action, from_status, to_status, notes, created_at,
      from_event_id, to_event_id,
      performed_by_staff:org_staff!performed_by(email),
      registration:registrations!registration_id(
        client_profiles(first_name, last_name)
      ),
      from_event:events!from_event_id(title),
      to_event:events!to_event_id(title)
    `,
    )
    .in("registration_id", registrationIds)
    .order("created_at", { ascending: false });

  if (entriesError) {
    return Response.json({ error: entriesError.message }, { status: 500 });
  }

  const data = entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    from_status: entry.from_status,
    to_status: entry.to_status,
    notes: entry.notes,
    created_at: entry.created_at,
    from_event_id: entry.from_event_id,
    to_event_id: entry.to_event_id,
    from_event_title: entry.from_event?.title || null,
    to_event_title: entry.to_event?.title || null,
    performed_by_email: entry.performed_by_staff?.email || null,
    client_name: [
      entry.registration?.client_profiles?.first_name,
      entry.registration?.client_profiles?.last_name,
    ]
      .filter(Boolean)
      .join(" "),
  }));

  return Response.json({ entries: data }, { status: 200 });
}
