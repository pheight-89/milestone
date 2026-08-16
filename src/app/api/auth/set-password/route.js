import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { password } = await request.json();

  if (!password || password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { password, user_metadata: { password_set: true } },
  );

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 400 });
  }
  return Response.json({ success: true }, { status: 200 });
}
