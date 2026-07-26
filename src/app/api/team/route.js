import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: staff, error: staffError } = await supabaseAdmin
    .from("org_staff")
    .select("id, email, role, created_at")
    .eq("org_id", user.org_id)
    .order("created_at", { ascending: true });

  if (staffError) {
    return Response.json({ error: staffError.message }, { status: 500 });
  }

  return Response.json({ staff }, { status: 200 });
}

//invite new staff member
export async function POST(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "admin") {
    return Response.json(
      { error: "Only admins can invite staff" },
      { status: 403 },
    );
  }

  const { email, role } = await request.json();

  const { data: existing } = await supabaseAdmin
    .from("org_staff")
    .select("id")
    .eq("org_id", user.org_id)
    .eq("email", email)
    .single();

  if (existing) {
    return Response.json(
      { error: "This email is already a member of your organization" },
      { status: 400 },
    );
  }

  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    });

  if (inviteError) {
    return Response.json({ error: inviteError.message }, { status: 400 });
  }

  //creating the organization staff record

  const { error: staffError } = await supabaseAdmin.from("org_staff").insert({
    org_id: user.org_id,
    email,
    auth_user_id: inviteData.user.id,
    role: role || "staff",
  });

  if (staffError) {
    return Response.json({ error: staffError.message }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 201 });
}
