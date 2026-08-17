import "server-only";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return Response.json(
      {
        error:
          "Account created but email confirmation is required. Please disable email confirmation in Supabase for development.",
      },
      { status: 400 },
    );
  }

  const { error: familyError } = await supabaseAdmin
    .from("family_accounts")
    .insert({ email, auth_user_id: authData.user.id });

  if (familyError) {
    return Response.json({ error: familyError.message }, { status: 400 });
  }

  const response = Response.json({ success: true }, { status: 200 });

  if (authData.session) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.headers.set(
      "Set-Cookie",
      `milestone_token=${authData.session.access_token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax${secure}`,
    );
  }

  return response;
}
