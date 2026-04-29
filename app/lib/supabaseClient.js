import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing! Check your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchCoolingTowerModels = async () => {
  const { data, error } = await supabase.from("cooling_tower_models").select("*");

  if (error) {
    console.error("Error fetching cooling tower models:", error.message);
    return [];
  }

  return data;
};
