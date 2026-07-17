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

  const { data: staffRecord, error: staffError } = await supabaseAdmin
    .from("org_staff")
    .select("org_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (staffError) {
    return Response.json({ error: "Staff record not found" }, { status: 404 });
  }

  return Response.json(
    {
      user: {
        id: user.id,
        email: user.email,
        org_id: staffRecord.org_id,
        role: staffRecord.role,
      },
    },
    { status: 200 },
  );
}
