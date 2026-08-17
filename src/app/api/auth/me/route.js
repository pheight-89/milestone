import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

export async function GET(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("milestone_token")?.value;

  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return Response.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  const { data: staffRecord } = await supabaseAdmin
    .from("org_staff")
    .select("org_id, role, organizations(org_type)")
    .eq("auth_user_id", user.id)
    .single();

  if (staffRecord) {
    return Response.json(
      {
        user: {
          id: user.id,
          email: user.email,
          user_type: "staff",
          org_id: staffRecord.org_id,
          role: staffRecord.role,
          org_type: staffRecord.organizations?.org_type,
        },
      },
      { status: 200 },
    );
  }

  const { data: familyRecord } = await supabaseAdmin
    .from("family_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (familyRecord) {
    return Response.json(
      {
        user: {
          id: user.id,
          email: user.email,
          user_type: "family",
          family_account_id: familyRecord.id,
        },
      },
      { status: 200 },
    );
  }

  return Response.json({ error: "Account not found" }, { status: 401 });
}
