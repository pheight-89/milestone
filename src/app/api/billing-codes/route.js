import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.org_type === "county_board") {
    const { data: codes, error: codesError } = await supabaseAdmin
      .from("county_billing_codes")
      .select("id, code, description, rate, is_addon, active")
      .eq("county_board_org_id", user.org_id)
      .order("code", { ascending: true });

    if (codesError) {
      return Response.json({ error: codesError.message }, { status: 500 });
    }

    return Response.json({ codes }, { status: 200 });
  }

  if (user.org_type === "provider") {
    const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
      .from("org_counties")
      .select("county_id")
      .eq("org_id", user.org_id);

    if (orgCountiesError) {
      return Response.json({ error: orgCountiesError.message }, { status: 500 });
    }

    const countyIds = orgCounties.map((oc) => oc.county_id);
    if (countyIds.length === 0) {
      return Response.json({ codes: [] }, { status: 200 });
    }

    const { data: counties, error: countiesError } = await supabaseAdmin
      .from("counties")
      .select("county_board_org_id")
      .in("id", countyIds);

    if (countiesError) {
      return Response.json({ error: countiesError.message }, { status: 500 });
    }

    const countyBoardOrgIds = [
      ...new Set(counties.map((c) => c.county_board_org_id)),
    ];

    if (countyBoardOrgIds.length === 0) {
      return Response.json({ codes: [] }, { status: 200 });
    }

    const { data: codes, error: codesError } = await supabaseAdmin
      .from("county_billing_codes")
      .select("id, code, description, rate, is_addon, active")
      .in("county_board_org_id", countyBoardOrgIds)
      .eq("active", true)
      .order("code", { ascending: true });

    if (codesError) {
      return Response.json({ error: codesError.message }, { status: 500 });
    }

    return Response.json({ codes }, { status: 200 });
  }

  return Response.json({ codes: [] }, { status: 200 });
}

export async function POST(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.org_type !== "county_board" || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { code, description, rate, is_addon } = await request.json();

  if (!code || !description) {
    return Response.json(
      { error: "Code and description are required" },
      { status: 400 },
    );
  }

  const numericRate = Number(rate);
  if (!numericRate || numericRate <= 0) {
    return Response.json(
      { error: "Rate must be greater than 0" },
      { status: 400 },
    );
  }

  const { data: billingCode, error: insertError } = await supabaseAdmin
    .from("county_billing_codes")
    .insert({
      county_board_org_id: user.org_id,
      code: code.toUpperCase().trim(),
      description,
      rate: numericRate,
      is_addon: !!is_addon,
      active: true,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return Response.json(
        { error: "This code already exists" },
        { status: 409 },
      );
    }
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ billing_code: billingCode }, { status: 201 });
}
