import { z } from "zod";
import { cooldownMinutes } from "@/lib/votes";
import { getDb, dbConfigured, userFromRequest } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const id = z.string().uuid();

/** Public vote count for a listed project. Totals only; voters are never exposed. */
export async function GET(req: Request) {
  const sid = id.safeParse(new URL(req.url).searchParams.get("submissionId"));
  if (!dbConfigured() || !sid.success) return Response.json({ configured: false, votes: 0 });
  const { count } = await getDb().from("community_votes").select("*", { count: "exact", head: true }).eq("submission_id", sid.data);
  return Response.json({ configured: true, votes: count ?? 0 });
}

/**
 * One vote per signed-in user per project per day, with a 30 minute cooldown between any two votes.
 * The cooldown is stated in the response so the UI can show it before the user taps again.
 */
export async function POST(req: Request) {
  if (!dbConfigured()) return Response.json({ error: "Voting is not available yet." }, { status: 503 });
  if (!rateLimit(`vote:${clientKey(req)}`, 20, 60_000).ok) return Response.json({ error: "Too many requests" }, { status: 429 });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Sign in to vote." }, { status: 401 });
  const body = z.object({ submissionId: id }).safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 422 });

  const db = getDb();
  const { data: sub } = await db.from("token_submissions").select("id").eq("id", body.data.submissionId).eq("status", "published").maybeSingle();
  if (!sub) return Response.json({ error: "Only listed projects can be voted on." }, { status: 409 });

  const { data: last } = await db.from("community_votes").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const wait = cooldownMinutes(last?.created_at ?? null);
  if (wait > 0) return Response.json({ error: `Please wait ${wait} minute${wait === 1 ? "" : "s"} to vote again`, waitMinutes: wait }, { status: 429, headers: { "Retry-After": String(wait * 60) } });

  const { error } = await db.from("community_votes").insert({ user_id: user.id, submission_id: sub.id });
  if (error) return Response.json({ error: error.code === "23505" ? "You already voted for this project today." : "Could not record the vote." }, { status: error.code === "23505" ? 409 : 500 });
  const { count } = await db.from("community_votes").select("*", { count: "exact", head: true }).eq("submission_id", sub.id);
  return Response.json({ ok: true, votes: count ?? 0 });
}
