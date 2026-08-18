import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: orgCounties, error: orgCountiesError } = await supabaseAdmin
    .from("org_counties")
    .select("id, county_id, counties(id, name, state)")
    .eq("org_id", user.org_id);

  if (orgCountiesError) {
    return Response.json({ error: orgCountiesError.message }, { status: 500 });
  }

  const counties = orgCounties.map((oc) => ({
    link_id: oc.id,
    id: oc.counties?.id,
    name: oc.counties?.name,
    state: oc.counties?.state,
  }));

  return Response.json({ counties }, { status: 200 });
}
