import { beforeEach, describe, expect, it, vi } from "vitest";
import { cooldownMinutes } from "@/lib/votes";
import { createFakeDb, type Tables } from "./admin-fakedb";

const state: { tables: Tables } = { tables: {} };
vi.mock("@/lib/supabase/admin", () => ({
  supabaseConfigured: () => true,
  supabaseAdmin: () => createFakeDb(state.tables, new Set()),
  userFromRequest: async (req: Request) => {
    const t = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    return t?.startsWith("tok-") ? { id: `did:privy:${t.slice(4)}`, email: null } : null;
  },
}));

const SUB = "11111111-1111-4111-8111-111111111111";
const post = (uid: string | null, body: unknown = { submissionId: SUB }) => new Request("http://x/api/vote", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...(uid ? { authorization: `Bearer tok-${uid}` } : {}) } });

beforeEach(() => {
  state.tables = { token_submissions: [{ id: SUB, status: "published" }, { id: "22222222-2222-4222-8222-222222222222", status: "draft" }], community_votes: [] };
});

describe("cooldownMinutes", () => {
  it("is zero with no previous vote or after 30 minutes, and rounds up inside the window", () => {
    const now = Date.parse("2026-12-01T12:00:00Z");
    expect(cooldownMinutes(null, now)).toBe(0);
    expect(cooldownMinutes("2026-12-01T11:30:00Z", now)).toBe(0);
    expect(cooldownMinutes("2026-12-01T11:45:00Z", now)).toBe(15);
    expect(cooldownMinutes("2026-12-01T11:59:30Z", now)).toBe(30);
  });
});

describe("POST /api/vote", () => {
  it("requires sign in and a valid body", async () => {
    const { POST } = await import("@/app/api/vote/route");
    expect((await POST(post(null))).status).toBe(401);
    expect((await POST(post("a", { submissionId: "nope" }))).status).toBe(422);
  });
  it("only allows voting on published projects", async () => {
    const { POST } = await import("@/app/api/vote/route");
    expect((await POST(post("a", { submissionId: "22222222-2222-4222-8222-222222222222" }))).status).toBe(409);
  });
  it("counts a vote, then enforces the 30 minute cooldown with the wait stated", async () => {
    const { POST } = await import("@/app/api/vote/route");
    const first = await POST(post("a"));
    expect(first.status).toBe(200);
    expect((await first.json()).votes).toBe(1);
    state.tables.community_votes![0]!.created_at = new Date(Date.now() - 10 * 60_000).toISOString();
    const second = await POST(post("a"));
    expect(second.status).toBe(429);
    const j = await second.json();
    expect(j.error).toMatch(/Please wait 20 minutes to vote again/);
    expect(Number(second.headers.get("retry-after"))).toBe(20 * 60);
  });
  it("lets a different user vote at the same moment", async () => {
    const { POST } = await import("@/app/api/vote/route");
    await POST(post("a"));
    expect((await POST(post("b"))).status).toBe(200);
  });
});
