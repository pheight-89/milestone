import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

export async function POST(request) {
  const { access_token } = await request.json();

  if (!access_token) {
    return Response.json({ error: "No token provided" }, { status: 400 });
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(access_token);

  if (error || !user) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("milestone_token", access_token, {
    httpOnly: true,
    path: "/",
    maxAge: 3600,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({ success: true }, { status: 200 });
}
