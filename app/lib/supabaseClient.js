import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing! Check your environment variables.");
}

// Client-side Supabase instance (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchCoolingTowerModels = async () => {
  const { data, error } = await supabase.from("cooling_tower_models").select("*");

  if (error) {
    console.error("Error fetching cooling tower models:", error.message);
    return [];
  }

  return data;
};

// Helper function to register a user via API route (uses service role on backend)
export const registerUser = async (email, password, name, company, country) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
        company,
        country,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};
