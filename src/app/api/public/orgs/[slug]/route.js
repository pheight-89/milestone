import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { slug } = await params;

  const { data: org, error } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (error || !org) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  return Response.json({ org }, { status: 200 });
}
