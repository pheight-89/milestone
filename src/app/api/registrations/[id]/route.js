import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  sendRegistrationEmail,
  confirmationEmailBody,
  declinedEmailBody,
} from "@/lib/sendEmail";

const VALID_STATUSES = ["confirmed", "declined", "pending"];

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "admin" && user.role !== "staff") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status, staff_notes, override_reason } = await request.json();

  if (!VALID_STATUSES.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: currentRegistration, error: regError } = await supabaseAdmin
    .from("registrations")
    .select("id, org_id, event_id, status")
    .eq("id", id)
    .eq("org_id", user.org_id)
    .single();

  if (regError || !currentRegistration) {
    return Response.json({ error: "Registration not found" }, { status: 404 });
  }

  const updates = {};

  if (staff_notes !== undefined) {
    updates.staff_notes = staff_notes;
  }

  if (status === "confirmed") {
    const { count, error: countError } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", currentRegistration.event_id)
      .eq("status", "confirmed");

    if (countError) {
      return Response.json({ error: countError.message }, { status: 500 });
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("capacity")
      .eq("id", currentRegistration.event_id)
      .single();

    if (eventError || !event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    const atCapacity = count >= event.capacity;

    if (atCapacity) {
      if (override_reason === undefined || override_reason === null) {
        return Response.json(
          {
            error: "Event is at capacity",
            confirmed_count: count,
            capacity: event.capacity,
            requires_override: true,
          },
          { status: 409 },
        );
      }

      if (!override_reason.trim()) {
        return Response.json(
          { error: "Override reason is required" },
          { status: 400 },
        );
      }

      updates.is_over_capacity_override = true;
      updates.override_reason = override_reason.trim();
    } else {
      updates.is_over_capacity_override = false;
      updates.override_reason = null;
    }

    updates.decided_by = user.staff_id;
    updates.decided_at = new Date().toISOString();
  } else if (status === "declined") {
    updates.decided_by = user.staff_id;
    updates.decided_at = new Date().toISOString();
  } else if (status === "pending") {
    updates.decided_by = null;
    updates.decided_at = null;
    updates.is_over_capacity_override = false;
    updates.override_reason = null;
  }

  updates.status = status;

  const { data: updatedRegistration, error: updateError } = await supabaseAdmin
    .from("registrations")
    .update(updates)
    .eq("id", id)
    .eq("org_id", user.org_id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("registration_audit_log").insert({
    registration_id: id,
    action:
      status === "confirmed"
        ? "confirmed"
        : status === "declined"
          ? "declined"
          : "reset_to_pending",
    from_status: currentRegistration.status,
    to_status: status,
    performed_by: user.staff_id,
    notes: override_reason || staff_notes || null,
  });

  // Get family email and client name for notification
  const { data: registration } = await supabaseAdmin
    .from("registrations")
    .select(
      "family_account_id, client_profile_id, family_accounts(email), client_profiles(first_name, last_name), events(title, date, organizations(name))",
    )
    .eq("id", id)
    .single();

  const familyEmail = registration.family_accounts?.email;
  const clientName = `${registration.client_profiles?.first_name} ${registration.client_profiles?.last_name}`;
  const eventTitle = registration.events?.title;
  const eventDate = registration.events?.date;
  const orgName = registration.events?.organizations?.name;

  if (familyEmail && status === "confirmed") {
    await sendRegistrationEmail({
      to: familyEmail,
      subject: `Registration Confirmed — ${eventTitle}`,
      body: confirmationEmailBody(clientName, eventTitle, eventDate, orgName),
    });
  }

  if (familyEmail && status === "declined") {
    await sendRegistrationEmail({
      to: familyEmail,
      subject: `Registration Update — ${eventTitle}`,
      body: declinedEmailBody(clientName, eventTitle, orgName),
    });
  }

  return Response.json({ registration: updatedRegistration }, { status: 200 });
}
