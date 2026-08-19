import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(request, { params }) {
  const { id, codeId } = await params;
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

  const { error: deleteError } = await supabaseAdmin
    .from("event_billing_codes")
    .delete()
    .eq("id", codeId)
    .eq("event_id", id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}
