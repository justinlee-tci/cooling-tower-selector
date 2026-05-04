import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with service_role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, name, company, country, password, role = "user" } = body;

    // Validate input
    if (!email || !name || !company || !country || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Insert user into users table (using service_role, bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          email,
          name,
          password,
          company,
          country,
          role,
          last_logged_in: null,
        },
      ]);

    if (error) {
      console.error("Database insert error:", error);
      
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ error: "User already exists" }),
          { status: 409 }
        );
      }

      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
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
