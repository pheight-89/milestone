import "server-only";
import { getUserAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "multiselect",
  "checkbox",
  "date",
];

export async function GET() {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  const { data: fields, error: fieldsError } = await supabaseAdmin
    .from("org_field_definitions")
    .select("*")
    .eq("org_id", user.org_id)
    .order("sort_order", { ascending: true });

  if (fieldsError) {
    return Response.json({ error: fieldsError.message }, { status: 500 });
  }

  return Response.json({ fields }, { status: 200 });
}

export async function POST(request) {
  const { user, error } = await getUserAuth();
  if (error) return Response.json({ error }, { status: 401 });

  if (user.role !== "admin") {
    return Response.json(
      { error: "Only admins can create fields" },
      { status: 403 },
    );
  }

  const { label, field_type, options, required } = await request.json();

  if (!label || !field_type) {
    return Response.json(
      { error: "Label and field type are required" },
      { status: 400 },
    );
  }

  if (!FIELD_TYPES.includes(field_type)) {
    return Response.json({ error: "Invalid field type" }, { status: 400 });
  }

  const needsOptions = field_type === "select" || field_type === "multiselect";
  const cleanOptions = needsOptions
    ? (Array.isArray(options) ? options : [])
        .map((option) => option.trim())
        .filter(Boolean)
    : null;

  if (needsOptions && cleanOptions.length === 0) {
    return Response.json(
      { error: "At least one option is required for this field type" },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("org_field_definitions")
    .select("field_key, sort_order")
    .eq("org_id", user.org_id);

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 });
  }

  const existingKeys = new Set(existing.map((field) => field.field_key));
  const baseKey =
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field";

  let fieldKey = baseKey;
  let suffix = 2;
  while (existingKeys.has(fieldKey)) {
    fieldKey = `${baseKey}_${suffix}`;
    suffix++;
  }

  const sortOrder =
    existing.length > 0
      ? Math.max(...existing.map((field) => field.sort_order)) + 1
      : 0;

  const { data: field, error: insertError } = await supabaseAdmin
    .from("org_field_definitions")
    .insert({
      org_id: user.org_id,
      label,
      field_key: fieldKey,
      field_type,
      options: cleanOptions,
      required: !!required,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ field }, { status: 201 });
}
