import { supabaseAdmin, getRequestUser, jsonError } from "@/lib/apiAuth";

export async function GET(req) {
  try {
    const user = await getRequestUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const modelName = searchParams.get("model_name");

    if (!modelName) {
      return jsonError("Model name is required", 400);
    }

    // Fetch model details using service_role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("cooling_tower_models")
      .select("*")
      .eq("model_name", modelName)
      .maybeSingle();

    if (error) {
      console.error("Database query error:", error);
      return jsonError(error.message, 400);
    }

    if (!data) {
      return jsonError(`Model "${modelName}" not found`, 404);
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("API error:", err);
    return jsonError(err.message, 500);
  }
}
