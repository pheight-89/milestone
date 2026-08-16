import "server-only";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const response = Response.json({ success: true }, { status: 200 });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.set(
    "Set-Cookie",
    `milestone_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
  );

  return response;
}
