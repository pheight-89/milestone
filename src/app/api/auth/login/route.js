import "server-only";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return Response.json(
      { error: "email and password are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("auth data:", JSON.stringify(data));
  console.log("auth error:", JSON.stringify(error));

  if (error) {
    return Response.json({ error: error.message }, { status: 401 });
  }

  if (!data.session) {
    return Response.json({ error: "No session returned" }, { status: 401 });
  }

  const response = Response.json({ success: true }, { status: 200 });

  response.headers.set(
    "Set-Cookie",
    `milestone_token=${data.session.access_token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax; Secure`,
  );

  return response;
}
