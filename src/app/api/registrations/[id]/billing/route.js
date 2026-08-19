import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: registration, error: regError } = await supabaseAdmin
    .from("registrations")
    .select("id, org_id, client_profile_id")
    .eq("id", id)
    .single();

  if (regError || !registration) {
    return Response.json({ error: "Registration not found" }, { status: 404 });
  }

  const isOwnOrgStaff =
    user.org_type !== "county_board" && registration.org_id === user.org_id;

  let isAuthorizedSsa = false;
  if (user.role === "ssa") {
    const { data: caseloadEntry } = await supabaseAdmin
      .from("ssa_caseload")
      .select("id")
      .eq("ssa_staff_id", user.staff_id)
      .eq("client_profile_id", registration.client_profile_id)
      .limit(1)
      .maybeSingle();
    isAuthorizedSsa = !!caseloadEntry;
  }

  if (!isOwnOrgStaff && !isAuthorizedSsa) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: billing, error: billingError } = await supabaseAdmin
    .from("registration_billing")
    .select("id, code, description, rate, is_addon")
    .eq("registration_id", id);

  if (billingError) {
    return Response.json({ error: billingError.message }, { status: 500 });
  }

  return Response.json({ billing }, { status: 200 });
}
