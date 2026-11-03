import "server-only";
import { supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

/** Shared gate for per-user routes: configured, not rate limited, and a verified Privy user. */
export async function userGuard(req: Request, scope: string): Promise<{ user: { id: string; email: string | null } } | { res: Response }> {
  if (!supabaseConfigured()) return { res: Response.json({ error: "Accounts are not connected yet." }, { status: 503 }) };
  if (!rateLimit(`${scope}:${clientKey(req)}`, 60, 60_000).ok) return { res: Response.json({ error: "Too many requests" }, { status: 429 }) };
  const user = await userFromRequest(req);
  if (!user) return { res: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  return { user };
}
