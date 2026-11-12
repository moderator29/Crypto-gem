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

const GUEST = /^guest\.([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/** Owner id for a no-account visitor: `guest_<uuid>`, from a random 122-bit key that only that browser holds. */
export function guestIdFromRequest(req: Request): string | null {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const m = GUEST.exec(token);
  return m ? `guest_${(m[1] as string).toLowerCase()}` : null;
}

/**
 * Resolve who is calling. No account is needed: a verified Privy user wins when present, otherwise the
 * browser's own guest key identifies the visitor. Admin access is never granted to guests (roles are keyed by Privy id).
 */
export async function userFromRequest(req: Request): Promise<{ id: string; email: string | null; guest?: boolean } | null> {
  const privy = await privyUserFromRequest(req);
  if (privy) return privy;
  const guest = guestIdFromRequest(req);
  return guest ? { id: guest, email: null, guest: true } : null;
}
