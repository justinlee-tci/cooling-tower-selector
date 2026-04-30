import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // Verify the request is coming from a trusted source (optional but recommended)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.KEEP_ALIVE_SECRET}`) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create Supabase client with service role key for trusted operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert a record into keep_alive table
    const { data, error } = await supabase
      .from("keep_alive")
      .insert([
        {
          pinged_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error("Keep-alive ping failed:", error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json(
      { success: true, message: "Keep-alive ping successful", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in keep-alive:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
