import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/** Privileged client. Bypasses RLS, so callers must bind every query to a verified user id. */
export function supabaseAdmin(): SupabaseClient {
  if (!supabaseConfigured()) throw new Error("Supabase is not configured");
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Resolve the signed-in user from a `Authorization: Bearer <access token>` header. */
export async function userFromRequest(req: Request): Promise<{ id: string; email: string | null } | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !supabaseConfigured()) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
