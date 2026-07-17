import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("milestone_token="))
    ?.split("=")[1];

  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify the token and get the user
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
