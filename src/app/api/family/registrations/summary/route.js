import "server-only";
import { getFamilyAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { family, error } = await getFamilyAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: registrations, error: regError } = await supabaseAdmin
    .from("registrations")
    .select("status")
    .eq("family_account_id", family.id);

  if (regError) {
    return Response.json({ error: regError.message }, { status: 500 });
  }

  const summary = registrations.reduce(
    (acc, r) => {
      if (r.status === "confirmed") acc.confirmed++;
      else if (r.status === "pending") acc.pending++;
      else if (r.status === "declined") acc.declined++;
      acc.total++;
      return acc;
    },
    { total: 0, confirmed: 0, pending: 0, declined: 0 },
  );

  return Response.json(summary, { status: 200 });
}
