import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Writes one in-app notification. A failed write is reported to the caller, never swallowed silently. */
export async function notify(db: SupabaseClient, userId: string, kind: string, title: string, body: string | null, href: string | null): Promise<boolean> {
  const { error } = await db.from("notifications").insert({ user_id: userId, kind, title, body, href });
  return !error;
}
