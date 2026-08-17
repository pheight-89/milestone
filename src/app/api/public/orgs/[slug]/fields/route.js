import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { slug } = await params;

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();

  if (orgError || !org) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: fields, error: fieldsError } = await supabaseAdmin
    .from("org_field_definitions")
    .select("id, label, field_key, field_type, options, required, sort_order")
    .eq("org_id", org.id)
    .order("sort_order", { ascending: true });

  if (fieldsError) {
    return Response.json({ error: fieldsError.message }, { status: 500 });
  }

  return Response.json({ fields }, { status: 200 });
}
