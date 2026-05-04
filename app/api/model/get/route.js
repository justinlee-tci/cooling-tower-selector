import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const modelName = searchParams.get("model_name");

    if (!modelName) {
      return new Response(
        JSON.stringify({ error: "Model name is required" }),
        { status: 400 }
      );
    }

    // Fetch model details using service_role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("cooling_tower_models")
      .select("*")
      .eq("model_name", modelName)
      .maybeSingle();

    if (error) {
      console.error("Database query error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: `Model "${modelName}" not found` }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200 }
    );
  } catch (err) {
    console.error("API error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
