import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { privyUserFromRequest } from "@/lib/auth/privy";

let client: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/** Privileged database client. Bypasses RLS, so callers must bind every query to a verified Privy user id. */
export function supabaseAdmin(): SupabaseClient {
  if (!supabaseConfigured()) throw new Error("Supabase is not configured");
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/**
 * Resolve the signed-in user. Identity comes from Privy; Supabase is used only as the database.
 * The returned id is the Privy DID and is what every owner column stores.
 */
export async function userFromRequest(req: Request): Promise<{ id: string; email: string | null } | null> {
  return privyUserFromRequest(req);
}
