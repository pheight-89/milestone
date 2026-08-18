import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data: counties, error } = await supabaseAdmin
    .from("counties")
    .select("id, name, state")
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ counties }, { status: 200 });
}
