import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const selection = body;

    // Validate required fields
    if (!selection.id || !selection.user_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Insert selection into database
    const { data, error } = await supabaseAdmin
      .from("selections")
      .insert([selection]);

    if (error) {
      console.error("Database insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Selection saved successfully",
        data,
      }),
      { status: 201 }
    );
  } catch (err) {
    console.error("API error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
