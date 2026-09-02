import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendRegistrationEmail, movedEmailBody } from "@/lib/sendEmail";

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "admin" && user.role !== "staff") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { destination_event_id, override_reason } = await request.json();

  if (!destination_event_id) {
    return Response.json(
      { error: "destination_event_id is required" },
      { status: 400 },
    );
  }

  const { data: currentRegistration, error: regError } = await supabaseAdmin
    .from("registrations")
    .select("id, org_id, event_id, status, payment_type, client_profile_id")
    .eq("id", id)
    .eq("org_id", user.org_id)
    .single();

  if (regError || !currentRegistration) {
    return Response.json({ error: "Registration not found" }, { status: 404 });
  }

  if (destination_event_id === currentRegistration.event_id) {
    return Response.json(
      { error: "Registration is already in this event" },
      { status: 400 },
    );
  }

  const { data: destinationEvent, error: destEventError } = await supabaseAdmin
    .from("events")
    .select("id, capacity")
    .eq("id", destination_event_id)
    .eq("org_id", user.org_id)
    .single();

  if (destEventError || !destinationEvent) {
    return Response.json({ error: "Destination event not found" }, { status: 404 });
  }

  if (currentRegistration.payment_type === "funded") {
    const { data: sourceCodes, error: sourceCodesError } = await supabaseAdmin
      .from("event_billing_codes")
      .select("code")
      .eq("event_id", currentRegistration.event_id);

    if (sourceCodesError) {
      return Response.json({ error: sourceCodesError.message }, { status: 500 });
    }

    const { data: destCodes, error: destCodesError } = await supabaseAdmin
      .from("event_billing_codes")
      .select("code")
      .eq("event_id", destination_event_id);

    if (destCodesError) {
      return Response.json({ error: destCodesError.message }, { status: 500 });
    }

    const sourceCodeSet = new Set(sourceCodes.map((c) => c.code));
    const destCodeSet = new Set(destCodes.map((c) => c.code));

    const matches =
      sourceCodeSet.size === destCodeSet.size &&
      [...sourceCodeSet].every((code) => destCodeSet.has(code));

    if (!matches) {
      return Response.json(
        {
          error:
            "Destination event does not have the same billing codes as the current event",
        },
        { status: 400 },
      );
    }
  }

  const { count: confirmedCount, error: countError } = await supabaseAdmin
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", destination_event_id)
    .eq("status", "confirmed");

  if (countError) {
    return Response.json({ error: countError.message }, { status: 500 });
  }

  const atCapacity = confirmedCount >= destinationEvent.capacity;

  if (atCapacity) {
    if (override_reason === undefined || override_reason === null) {
      return Response.json(
        {
          requires_override: true,
          confirmed_count: confirmedCount,
          capacity: destinationEvent.capacity,
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
  }

  const originalStatus = currentRegistration.status;
  const originalEventId = currentRegistration.event_id;

  const { data: updatedRegistration, error: updateError } = await supabaseAdmin
    .from("registrations")
    .update({
      event_id: destination_event_id,
      status: "pending",
      decided_by: null,
      decided_at: null,
      is_over_capacity_override: false,
      override_reason: null,
    })
    .eq("id", id)
    .eq("org_id", user.org_id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("registration_billing").delete().eq("registration_id", id);

  // Re-resolve billing codes against destination event + individual's county
  // board (skipped for self-pay, same as POST /api/registrations).
  if (currentRegistration.payment_type !== "self_pay") {
    const { data: eventCodes } = await supabaseAdmin
      .from("event_billing_codes")
      .select("code, is_addon")
      .eq("event_id", destination_event_id);

    const { data: countyAssoc } = await supabaseAdmin
      .from("client_county_associations")
      .select("county_id, counties(county_board_org_id)")
      .eq("client_profile_id", currentRegistration.client_profile_id)
      .limit(1)
      .maybeSingle();

    if (eventCodes?.length && countyAssoc?.counties?.county_board_org_id) {
      const countyBoardOrgId = countyAssoc.counties.county_board_org_id;

      for (const eventCode of eventCodes) {
        const { data: billingCode } = await supabaseAdmin
          .from("county_billing_codes")
          .select("id, description, rate")
          .eq("county_board_org_id", countyBoardOrgId)
          .eq("code", eventCode.code)
          .eq("active", true)
          .limit(1)
          .maybeSingle();

        if (billingCode) {
          await supabaseAdmin.from("registration_billing").insert({
            registration_id: id,
            county_billing_code_id: billingCode.id,
            code: eventCode.code,
            description: billingCode.description,
            rate: billingCode.rate,
            is_addon: eventCode.is_addon,
          });
        }
      }
    }
  }

  await supabaseAdmin.from("registration_audit_log").insert({
    registration_id: id,
    action: "moved",
    from_status: originalStatus,
    to_status: "pending",
    from_event_id: originalEventId,
    to_event_id: destination_event_id,
    performed_by: user.staff_id,
    notes: override_reason || null,
  });

  // Get family email and client name for notification
  const { data: registration } = await supabaseAdmin
    .from("registrations")
    .select(
      "family_account_id, client_profile_id, family_accounts(email), client_profiles(first_name, last_name), events(title, date, organizations(name))",
    )
    .eq("id", id)
    .single();

  const familyEmail = registration?.family_accounts?.email;
  const clientName = `${registration?.client_profiles?.first_name} ${registration?.client_profiles?.last_name}`;
  const eventTitle = registration?.events?.title;
  const eventDate = registration?.events?.date;

  if (familyEmail) {
    await sendRegistrationEmail({
      to: familyEmail,
      subject: `Registration Update — ${eventTitle}`,
      body: movedEmailBody(clientName, eventTitle, eventDate),
    });
  }

  return Response.json({ registration: updatedRegistration }, { status: 200 });
}
