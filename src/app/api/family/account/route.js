import "server-only";
import { getFamilyAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(request) {
  const { family, error } = await getFamilyAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { county_id } = await request.json();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("family_accounts")
    .update({ county_id: county_id || null })
    .eq("id", family.id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ family: updated }, { status: 200 });
}
