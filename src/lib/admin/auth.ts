import { getDb, dbConfigured, userFromRequest } from "@/lib/db";
import { hasAnyRole, isStaffRole, type StaffRole } from "./roles";

export interface Actor {
  id: string;
  email: string | null;
  roles: StaffRole[];
}

export type AuthResult = { ok: true; actor: Actor } | { ok: false; response: Response };

const deny = (status: number, error: string): AuthResult => ({ ok: false, response: Response.json({ error }, { status }) });

/** Resolve the caller and read their staff roles from `public.user_roles` through the server database client. */
export async function resolveActor(req: Request): Promise<AuthResult> {
  if (!dbConfigured()) return deny(503, "The database is not configured on the server.");
  const user = await userFromRequest(req);
  if (!user) return deny(401, "Sign in to continue.");
  const { data, error } = await getDb().from("user_roles").select("role").eq("user_id", user.id);
  if (error) return deny(500, "Could not verify your access.");
  const roles = ((data ?? []) as Array<{ role: string }>).map((r) => r.role).filter(isStaffRole);
  return { ok: true, actor: { id: user.id, email: user.email, roles } };
}

/**
 * Resolve the caller from the Bearer token and check `public.user_roles`. Returns a 401 (no valid
 * session), 403 (signed in, wrong role) or 503 (server not configured) Response on failure.
 * `super_admin` passes every check. The client is never trusted: roles are read from the database
 * on every request.
 */
export async function requireRole(req: Request, roles: readonly StaffRole[]): Promise<AuthResult> {
  const auth = await resolveActor(req);
  if (!auth.ok) return auth;
  if (!hasAnyRole(auth.actor.roles, roles)) return deny(403, "Your account does not have access to this action.");
  return auth;
}
