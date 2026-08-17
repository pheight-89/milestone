import "server-only";
import { getFamilyAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const { family, error } = await getFamilyAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("org_id");
  const idsParam = searchParams.get("client_profile_ids");

  if (!orgId || !idsParam) {
    return Response.json(
      { error: "org_id and client_profile_ids are required" },
      { status: 400 },
    );
  }

  const clientProfileIds = idsParam.split(",").filter(Boolean);

  const { data: ownedProfiles, error: profilesError } = await supabaseAdmin
    .from("client_profiles")
    .select("id")
    .eq("family_account_id", family.id)
    .in("id", clientProfileIds);

  if (profilesError) {
    return Response.json({ error: profilesError.message }, { status: 500 });
  }

  const ownedIds = ownedProfiles.map((p) => p.id);

  if (ownedIds.length === 0) {
    return Response.json({ profiles: {} }, { status: 200 });
  }

  const { data: orgProfiles, error: orgProfilesError } = await supabaseAdmin
    .from("client_org_profiles")
    .select("client_profile_id, custom_values")
    .eq("org_id", orgId)
    .in("client_profile_id", ownedIds);

  if (orgProfilesError) {
    return Response.json({ error: orgProfilesError.message }, { status: 500 });
  }

  const profiles = {};
  for (const p of orgProfiles) {
    profiles[p.client_profile_id] = p.custom_values;
  }

  return Response.json({ profiles }, { status: 200 });
}
