import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.org_type !== "county_board" || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: orgs, error: orgsError } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slug")
    .eq("org_type", "provider")
    .order("name", { ascending: true });

  if (orgsError) {
    return Response.json({ error: orgsError.message }, { status: 500 });
  }

  return Response.json({ orgs }, { status: 200 });
}
