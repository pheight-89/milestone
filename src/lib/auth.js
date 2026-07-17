import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import { cookies } from "next/headers";

export async function getUserAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("milestone_token")?.value;

  if (!token) {
    return { user: null, error: "No token provided" };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "Invalid or expired token" };
  }

  const { data: staffRecord } = await supabaseAdmin
    .from("org_staff")
    .select("id, org_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!staffRecord) {
    return { user: null, error: "Staff record not found" };
  }

  return {
    user: {
      ...user,
      auth_id: user.id,
      staff_id: staffRecord.id,
      org_id: staffRecord.org_id,
      role: staffRecord.role,
    },
    error: null,
  };
}
