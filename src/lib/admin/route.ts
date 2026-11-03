import type { z } from "zod";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";
import { requireRole, type Actor } from "./auth";
import { writeAudit } from "./audit";
import type { StaffRole } from "./roles";

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export type Guard = { ok: true; actor: Actor } | { ok: false; response: Response };

const tooMany = (retryAfterSec: number): Guard => ({ ok: false, response: Response.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(retryAfterSec) } }) });

/** Rate limit (per IP before auth, per actor after) then role check. Writes get a tighter budget. */
export async function guard(req: Request, roles: readonly StaffRole[], kind: "read" | "write" = "read"): Promise<Guard> {
  const ip = rateLimit(`admin-ip:${clientKey(req)}`, 240, 60_000);
  if (!ip.ok) return tooMany(ip.retryAfterSec);
  const auth = await requireRole(req, roles);
  if (!auth.ok) return auth;
  const rl = rateLimit(`admin-${kind}:${auth.actor.id}`, kind === "write" ? 30 : 120, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfterSec);
  return auth;
}

/** Parse and validate a JSON body with zod. Returns a 4xx Response on failure. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  const raw = await req.text();
  if (raw.length > 20_000) return { ok: false, response: json({ error: "Request body too large" }, 413) };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, response: json({ error: "Body must be valid JSON" }, 400) };
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, response: json({ error: "Invalid request: " + parsed.error.issues.map((i) => `${i.path.join(".") || "body"} ${i.message}`).join("; ") }, 422) };
  }
  return { ok: true, data: parsed.data };
}

/** Write the audit row. Returns an error Response when it could not be written, otherwise null. */
export async function auditOrFail(actor: Actor, action: string, target: string | null, before: unknown, after: unknown): Promise<Response | null> {
  try {
    await writeAudit(actor, action, target, before, after);
    return null;
  } catch {
    return json({ error: "The change was applied but the audit log could not be written. Check admin_audit_logs before continuing.", applied: true }, 500);
  }
}
