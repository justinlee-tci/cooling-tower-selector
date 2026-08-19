import { supabaseAdmin, getRequestUser, jsonError } from "@/lib/apiAuth";

// Columns that may be written. Anything else in the request body is ignored.
const NUMERIC_REQUIRED = [
  "water_flow_rate",
  "hot_water_temp",
  "cold_water_temp",
  "wet_bulb_temp",
  "ambient_pressure",
  "safety_factor",
  "actual_flowrate",
];

const TEXT_OPTIONAL = [
  "project_name",
  "customer_name",
  "location",
  "date_created",
  "selection_by",
  "description",
];

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export async function POST(req) {
  try {
    const user = await getRequestUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();

    if (!body.id) {
      return jsonError("Missing required fields", 400);
    }

    // Build the row from a whitelist rather than spreading the request body,
    // and take the owner from the verified session rather than the payload.
    const selection = {
      id: String(body.id),
      user_email: user.email,
      cooling_tower_model: body.cooling_tower_model,
      number_of_cells: toNumberOrNull(body.number_of_cells),
      dry_bulb_temp: toNumberOrNull(body.dry_bulb_temp), // nullable in the schema
    };

    for (const key of TEXT_OPTIONAL) {
      selection[key] = body[key] ?? null;
    }

    for (const key of NUMERIC_REQUIRED) {
      const value = toNumberOrNull(body[key]);
      if (value === null) {
        return jsonError(`Invalid or missing numeric field: ${key}`, 400);
      }
      selection[key] = value;
    }

    if (!selection.cooling_tower_model) {
      return jsonError("Missing required field: cooling_tower_model", 400);
    }

    if (!Number.isInteger(selection.number_of_cells) || selection.number_of_cells < 1) {
      return jsonError("Invalid or missing numeric field: number_of_cells", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("selections")
      .insert([selection]);

    if (error) {
      console.error("Database insert error:", error);
      return jsonError(error.message, 400);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Selection saved successfully",
        data,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("API error:", err);
    return jsonError(err.message, 500);
  }
}
