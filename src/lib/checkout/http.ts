import "server-only";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const noStore = { "cache-control": "no-store" };

export const fail = (error: string, status: number, headers?: Record<string, string>): Response =>
  Response.json({ error }, { status, headers: { ...noStore, ...headers } });

export const ok = (body: unknown): Response => Response.json(body, { headers: noStore });

/** Per IP fixed window limit. Returns a ready 429 response when the caller is over it. */
export function limit(req: Request, bucket: string, max: number, windowMs = 60_000): Response | null {
  const rl = rateLimit(`checkout-${bucket}:${clientKey(req)}`, max, windowMs);
  return rl.ok ? null : fail("Too many requests. Wait a moment and try again.", 429, { "retry-after": String(rl.retryAfterSec) });
}

/** Parses a small JSON object body, or null for anything else. */
export async function readJson(req: Request, maxBytes = 12_000): Promise<Record<string, unknown> | null> {
  try {
    const raw = await req.text();
    if (raw.length > maxBytes) return null;
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The public origin of the request, used only for links in the admin alert. */
export function originOf(req: Request): string | null {
  try {
    return new URL(req.url).origin;
  } catch {
    return null;
  }
}
