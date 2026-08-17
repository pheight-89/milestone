import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function DELETE(request, { params }) {
  const { orgId } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.org_type !== "county_board" || user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: counties, error: countiesError } = await supabaseAdmin
    .from("counties")
    .select("id")
    .eq("county_board_org_id", user.org_id);

  if (countiesError) {
    return Response.json({ error: countiesError.message }, { status: 500 });
  }

  const countyIds = counties.map((c) => c.id);

  if (countyIds.length === 0) {
    return Response.json(
      { error: "Organization not found for this county board" },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("org_counties")
    .delete()
    .eq("org_id", orgId)
    .in("county_id", countyIds);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}
