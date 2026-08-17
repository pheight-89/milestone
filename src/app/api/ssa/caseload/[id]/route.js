import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "ssa") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { span_start, span_end } = await request.json();

  if (!span_start || !span_end) {
    return Response.json(
      { error: "span_start and span_end are required" },
      { status: 400 },
    );
  }

  const { data: caseloadEntry, error: updateError } = await supabaseAdmin
    .from("ssa_caseload")
    .update({ span_start, span_end })
    .eq("id", id)
    .eq("ssa_staff_id", user.staff_id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseAdmin.from("ssa_access_log").insert({
    ssa_staff_id: user.staff_id,
    client_profile_id: caseloadEntry.client_profile_id,
    action: "updated_span_year",
  });

  return Response.json({ caseload: caseloadEntry }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "ssa") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: caseloadEntry, error: lookupError } = await supabaseAdmin
    .from("ssa_caseload")
    .select("client_profile_id")
    .eq("id", id)
    .eq("ssa_staff_id", user.staff_id)
    .single();

  if (lookupError || !caseloadEntry) {
    return Response.json(
      { error: "Caseload entry not found" },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("ssa_caseload")
    .delete()
    .eq("id", id)
    .eq("ssa_staff_id", user.staff_id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  await supabaseAdmin.from("ssa_access_log").insert({
    ssa_staff_id: user.staff_id,
    client_profile_id: caseloadEntry.client_profile_id,
    action: "removed_from_caseload",
  });

  return Response.json({ success: true }, { status: 200 });
}
