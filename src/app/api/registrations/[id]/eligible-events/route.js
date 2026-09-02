import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "admin" && user.role !== "staff") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: registration, error: regError } = await supabaseAdmin
    .from("registrations")
    .select("event_id, payment_type, org_id")
    .eq("id", id)
    .eq("org_id", user.org_id)
    .single();

  if (regError || !registration) {
    return Response.json({ error: "Registration not found" }, { status: 404 });
  }

  // Get future events for this org (excluding current event)
  const { data: futureEvents, error: eventsError } = await supabaseAdmin
    .from("events")
    .select("id, title, date, capacity, location, event_billing_codes(code)")
    .eq("org_id", registration.org_id)
    .neq("id", registration.event_id)
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true });

  if (eventsError) {
    return Response.json({ error: eventsError.message }, { status: 500 });
  }

  let eligibleEvents = futureEvents;
  let paymentType = "self_pay";

  // For funded registrations, filter to events with matching billing codes
  if (registration.payment_type === "funded") {
    paymentType = "funded";

    // Get source event billing codes
    const { data: sourceCodes, error: sourceCodesError } = await supabaseAdmin
      .from("event_billing_codes")
      .select("code")
      .eq("event_id", registration.event_id);

    if (sourceCodesError) {
      return Response.json({ error: sourceCodesError.message }, { status: 500 });
    }

    const sourceCodeSet = new Set(sourceCodes.map((c) => c.code));

    // Filter destination events that have ALL the same codes (both directions)
    eligibleEvents = futureEvents.filter((event) => {
      const destCodes = new Set(event.event_billing_codes.map((c) => c.code));
      return (
        sourceCodeSet.size === destCodes.size &&
        [...sourceCodeSet].every((code) => destCodes.has(code))
      );
    });
  }

  const eventIds = eligibleEvents.map((event) => event.id);
  const confirmedCountByEvent = new Map();

  if (eventIds.length > 0) {
    const { data: confirmedRegs, error: confirmedError } = await supabaseAdmin
      .from("registrations")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "confirmed");

    if (confirmedError) {
      return Response.json({ error: confirmedError.message }, { status: 500 });
    }

    for (const r of confirmedRegs) {
      confirmedCountByEvent.set(
        r.event_id,
        (confirmedCountByEvent.get(r.event_id) || 0) + 1,
      );
    }
  }

  const events = eligibleEvents.map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    capacity: event.capacity,
    location: event.location,
    billing_codes: event.event_billing_codes.map((c) => c.code),
    confirmed_count: confirmedCountByEvent.get(event.id) || 0,
  }));

  return Response.json({ events, payment_type: paymentType }, { status: 200 });
}
