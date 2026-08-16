import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, error: authError } = await getUserAuth();
  if (authError) return Response.json({ error: authError }, { status: 401 });

  if (user.org_id !== id) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: org, error } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slug")
    .eq("id", id)
    .single();

  if (error) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  return Response.json({ org }, { status: 200 });
}
