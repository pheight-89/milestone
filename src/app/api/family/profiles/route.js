import "server-only";
import { getFamilyAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { family, error } = await getFamilyAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("client_profiles")
    .select("*")
    .eq("family_account_id", family.id)
    .order("created_at", { ascending: true });

  if (profilesError) {
    return Response.json({ error: profilesError.message }, { status: 500 });
  }

  return Response.json({ profiles }, { status: 200 });
}

export async function POST(request) {
  const { family, error } = await getFamilyAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const body = await request.json();
  const {
    first_name,
    last_name,
    date_of_birth,
    primary_phone,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    support_needs,
    allergies,
    notes,
  } = body;

  if (!first_name || !last_name) {
    return Response.json(
      { error: "First name and last name are required" },
      { status: 400 },
    );
  }

  const { data: profile, error: insertError } = await supabaseAdmin
    .from("client_profiles")
    .insert({
      family_account_id: family.id,
      first_name,
      last_name,
      date_of_birth: date_of_birth || null,
      primary_phone: primary_phone || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      emergency_contact_relationship: emergency_contact_relationship || null,
      support_needs: support_needs || null,
      allergies: allergies || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ profile }, { status: 201 });
}
