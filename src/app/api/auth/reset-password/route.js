import "server-only";
import { supabase } from "@/lib/supabase";
import { responseCookiesToRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export async function POST(request) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return Response.json(
      { error: "Token and password are required" },
      { status: 400 },
    );
  }

  const { error: sessionError } =
    await supabase.auth.exchangeCodeForSession(token);

  if (sessionError) {
    return Response.json(
      { error: "Reset link is invalid or expired" },
      { status: 400 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true }, { status: 200 });
}
