import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: registrations, error: regError } = await supabaseAdmin
    .from("registrations")
    .select("status")
    .eq("org_id", user.org_id);

  if (regError) {
    return Response.json({ error: regError.message }, { status: 500 });
  }

  const summary = registrations.reduce(
    (acc, r) => {
      if (r.status === "pending") acc.pending_count++;
      else if (r.status === "confirmed") acc.confirmed_count++;
      else if (r.status === "declined") acc.declined_count++;
      acc.total++;
      return acc;
    },
    { pending_count: 0, confirmed_count: 0, declined_count: 0, total: 0 },
  );

  return Response.json(summary, { status: 200 });
}
