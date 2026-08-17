import "server-only";
import { getFamilyAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request, { params }) {
  const { id } = await params;
  const { family, error } = await getFamilyAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("client_profiles")
    .select("*")
    .eq("id", id)
    .eq("family_account_id", family.id)
    .single();

  if (profileError) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  return Response.json({ profile }, { status: 200 });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
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

  const { data: profile, error: updateError } = await supabaseAdmin
    .from("client_profiles")
    .update({
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
    .eq("id", id)
    .eq("family_account_id", family.id)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ profile }, { status: 200 });
}
