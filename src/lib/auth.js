import { supabaseAdmin } from "./supabaseAdmin";

export async function getUserAuth(req) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "No token provided" };
  }

  const token = authHeader.split(" ")[1];
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
