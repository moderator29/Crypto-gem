import { supabaseAdmin, supabaseConfigured, userFromRequest } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/utils/rateLimit";
import { PayError } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const noStore = { "cache-control": "no-store" };
export const fail = (error: string, status: number, headers?: Record<string, string>) => Response.json({ error }, { status, headers: { ...noStore, ...headers } });
export const ok = (body: unknown) => Response.json(body, { headers: noStore });

/** Common gate: configured, signed in, rate limited per user. Returns the user and a db client or a ready error response. */
export async function gate(req: Request, bucket: string, limit: number): Promise<{ user: { id: string }; db: SupabaseClient } | Response> {
  if (!supabaseConfigured()) return fail("Payments are not configured", 503);
  const user = await userFromRequest(req);
  if (!user) return fail("Sign in required", 401);
  const rl = rateLimit(`pay-${bucket}:${user.id}`, limit, 60_000);
  if (!rl.ok) return fail("Too many requests", 429, { "retry-after": String(rl.retryAfterSec) });
  return { user, db: supabaseAdmin() };
}

export function errorResponse(e: unknown): Response {
  if (e instanceof PayError) return fail(e.message, e.status);
  return fail("Something went wrong. Try again.", 500);
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const raw = await req.text();
    if (raw.length > 4000) return null;
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
