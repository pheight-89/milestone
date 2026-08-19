import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.org_type !== "county_board" || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};

  if (body.description !== undefined) updates.description = body.description;

  if (body.rate !== undefined) {
    const numericRate = Number(body.rate);
    if (!numericRate || numericRate <= 0) {
      return Response.json(
        { error: "Rate must be greater than 0" },
        { status: 400 },
      );
    }
    updates.rate = numericRate;
  }

  if (body.is_addon !== undefined) updates.is_addon = !!body.is_addon;
  if (body.active !== undefined) updates.active = !!body.active;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data: billingCode, error: updateError } = await supabaseAdmin
    .from("county_billing_codes")
    .update(updates)
    .eq("id", id)
    .eq("county_board_org_id", user.org_id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ billing_code: billingCode }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.org_type !== "county_board" || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: billingCode, error: updateError } = await supabaseAdmin
    .from("county_billing_codes")
    .update({ active: false })
    .eq("id", id)
    .eq("county_board_org_id", user.org_id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ billing_code: billingCode }, { status: 200 });
}
