import { resolveActor } from "@/lib/admin/auth";
import { json } from "@/lib/admin/route";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

/** Who am I and which staff roles do I hold. Used by the admin shell to decide what to show. Not an authorisation check. */
export async function GET(req: Request) {
  const rl = rateLimit(`admin-me:${clientKey(req)}`, 60, 60_000);
  if (!rl.ok) return json({ error: "Too many requests" }, 429);
  const auth = await resolveActor(req);
  if (!auth.ok) return auth.response;
  return json({ id: auth.actor.id, email: auth.actor.email, roles: auth.actor.roles });
}
