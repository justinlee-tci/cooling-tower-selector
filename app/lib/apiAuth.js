import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS, so every route using it must authenticate
// the caller itself via getRequestUser() below.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Validates the caller's access token and returns their Supabase user, or null.
 *
 * The browser stores its session in localStorage (see lib/supabaseClient.js),
 * not in cookies, so route handlers cannot read it from the request cookies.
 * The client sends it explicitly as `Authorization: Bearer <access_token>`.
 */
export async function getRequestUser(req) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;

  return data.user;
}

export function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
