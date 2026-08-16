import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "admin") {
    return Response.json(
      { error: "Only admins can edit fields" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const updates = {};

  if (body.label !== undefined) updates.label = body.label;
  if (body.field_type !== undefined) updates.field_type = body.field_type;
  if (body.options !== undefined) updates.options = body.options;
  if (body.required !== undefined) updates.required = !!body.required;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data: field, error: updateError } = await supabaseAdmin
    .from("org_field_definitions")
    .update(updates)
    .eq("id", id)
    .eq("org_id", user.org_id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ field }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "admin") {
    return Response.json(
      { error: "Only admins can delete fields" },
      { status: 403 },
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("org_field_definitions")
    .delete()
    .eq("id", id)
    .eq("org_id", user.org_id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}
