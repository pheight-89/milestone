import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getCountyBoardOrgIdsForOrg(orgId) {
  const { data: orgCounties } = await supabaseAdmin
    .from("org_counties")
    .select("county_id")
    .eq("org_id", orgId);

  const countyIds = (orgCounties || []).map((oc) => oc.county_id);
  if (countyIds.length === 0) return [];

  const { data: counties } = await supabaseAdmin
    .from("counties")
    .select("county_board_org_id")
    .in("id", countyIds);

  return [...new Set((counties || []).map((c) => c.county_board_org_id))];
}

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

  const { data: eventCodes, error: eventCodesError } = await supabaseAdmin
    .from("event_billing_codes")
    .select("id, code, is_addon")
    .eq("event_id", id);

  if (eventCodesError) {
    return Response.json({ error: eventCodesError.message }, { status: 500 });
  }

  if (eventCodes.length === 0) {
    return Response.json({ codes: [] }, { status: 200 });
  }

  const countyBoardOrgIds = await getCountyBoardOrgIdsForOrg(user.org_id);
  const billingCodesByCode = new Map();

  if (countyBoardOrgIds.length > 0) {
    const { data: billingCodes } = await supabaseAdmin
      .from("county_billing_codes")
      .select("code, description, rate")
      .in("county_board_org_id", countyBoardOrgIds)
      .in(
        "code",
        eventCodes.map((ec) => ec.code),
      );

    for (const billingCode of billingCodes || []) {
      if (!billingCodesByCode.has(billingCode.code)) {
        billingCodesByCode.set(billingCode.code, billingCode);
      }
    }
  }

  const codes = eventCodes.map((ec) => {
    const match = billingCodesByCode.get(ec.code);
    return {
      id: ec.id,
      code: ec.code,
      is_addon: ec.is_addon,
      description: match?.description || null,
      rate: match?.rate || 0,
    };
  });

  return Response.json({ codes }, { status: 200 });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.org_type !== "provider") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("id", id)
    .eq("org_id", user.org_id)
    .single();

  if (eventError || !event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const { code, is_addon } = await request.json();

  if (!code) {
    return Response.json({ error: "Code is required" }, { status: 400 });
  }

  const countyBoardOrgIds = await getCountyBoardOrgIdsForOrg(user.org_id);

  if (countyBoardOrgIds.length === 0) {
    return Response.json(
      { error: "This code is not available to your organization" },
      { status: 400 },
    );
  }

  const { data: matchingCode } = await supabaseAdmin
    .from("county_billing_codes")
    .select("id")
    .in("county_board_org_id", countyBoardOrgIds)
    .eq("code", code)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!matchingCode) {
    return Response.json(
      { error: "This code is not available to your organization" },
      { status: 400 },
    );
  }

  const { data: eventCode, error: insertError } = await supabaseAdmin
    .from("event_billing_codes")
    .insert({ event_id: id, code, is_addon: !!is_addon })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json(
        { error: "This code is already linked to this event" },
        { status: 409 },
      );
    }
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ event_code: eventCode }, { status: 201 });
}
