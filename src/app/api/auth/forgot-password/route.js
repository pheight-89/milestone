"import server-only";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  const { email } = await request.json();

  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    //change domain when live //
    redirectTo: "http://localhost:3000/reset-password",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ success: true }, { status: 200 });
}
