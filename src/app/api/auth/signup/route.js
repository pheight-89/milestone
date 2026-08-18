import "server-only";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  const body = await request.json();
  const { orgName, email, password, county_ids } = body;

  if (!orgName || !email || !password) {
    return Response.json(
      { error: "orgName, email, and password are required" },
      { status: 400 },
    );
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return Response.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return Response.json(
      {
        error:
          "Account created but email confirmation is required. Please disable email confirmation in Supabase for development.",
      },
      { status: 400 },
    );
  }

  const userId = authData.user.id;

  const slug = orgName.toLowerCase().trim().replace(/\s+/g, "-");

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .insert({ name: orgName, slug })
    .select()
    .single();

  if (orgError) {
    return Response.json({ error: orgError.message }, { status: 400 });
  }

  const { error: staffError } = await supabaseAdmin
    .from("org_staff")
    .insert({ org_id: org.id, email, auth_user_id: userId, role: "admin" });

  if (staffError) {
    return Response.json({ error: staffError.message }, { status: 400 });
  }

  if (Array.isArray(county_ids) && county_ids.length > 0) {
    // Best-effort: county linking failures shouldn't fail the whole signup.
    await supabaseAdmin
      .from("org_counties")
      .insert(county_ids.map((countyId) => ({ org_id: org.id, county_id: countyId })));
  }

  return Response.json({ success: true, org }, { status: 200 });
}
