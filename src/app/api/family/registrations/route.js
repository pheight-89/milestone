import "server-only";
import { getFamilyAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { family, error } = await getFamilyAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: registrations, error: regError } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, status, created_at, payment_type, event_id, client_profile_id, events(title, date), organizations(name), client_profiles(first_name, last_name)",
    )
    .eq("family_account_id", family.id)
    .order("created_at", { ascending: false });

  if (regError) {
    return Response.json({ error: regError.message }, { status: 500 });
  }

  const data = registrations.map((r) => ({
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    payment_type: r.payment_type,
    event_id: r.event_id,
    client_profile_id: r.client_profile_id,
    event_title: r.events?.title,
    event_date: r.events?.date,
    org_name: r.organizations?.name,
    client_first_name: r.client_profiles?.first_name,
    client_last_name: r.client_profiles?.last_name,
  }));

  return Response.json({ registrations: data }, { status: 200 });
}
