import { beforeEach, describe, expect, it, vi } from "vitest";

const uploads: Array<{ path: string; contentType?: string; size: number }> = [];
let uploadError: Error | null = null;
let configured = true;

vi.mock("@/lib/db", () => ({
  userFromRequest: async (req: Request) => {
    const t = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    return t?.startsWith("tok-") ? { id: t.slice(4), email: null } : null;
  },
}));

vi.mock("@/lib/storage", () => ({
  storageConfigured: () => configured,
  putImage: async (path: string, body: Uint8Array, kind: string) => {
    if (uploadError) throw uploadError;
    uploads.push({ path, contentType: `image/${kind}`, size: body.length });
    return `https://store1.public.blob.vercel-storage.com/${path}`;
  },
}));

/** Smallest byte sequence inspectImage reads as a PNG with the given size. */
function png(width: number, height: number, pad = 0): Uint8Array {
  const b = new Uint8Array(33 + pad);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const dv = new DataView(b.buffer);
  dv.setUint32(8, 13);
  b.set([0x49, 0x48, 0x44, 0x52], 12);
  dv.setUint32(16, width);
  dv.setUint32(20, height);
  return b;
}

let n = 0;
function upload(bytes: Uint8Array | string, uid: string | null = "did:privy:alice", type = "image/png") {
  const fd = new FormData();
  fd.append("file", new Blob([bytes as BlobPart], { type }), "logo.png");
  const headers: Record<string, string> = { "x-forwarded-for": `10.0.0.${++n}` };
  if (uid) headers.authorization = `Bearer tok-${uid}`;
  return new Request("http://x/api/uploads/logo", { method: "POST", body: fd, headers });
}

beforeEach(() => {
  uploads.length = 0;
  uploadError = null;
  configured = true;
});

describe("POST /api/uploads/logo", () => {
  it("rejects unauthenticated callers", async () => {
    const { POST } = await import("@/app/api/uploads/logo/route");
    expect((await POST(upload(png(256, 256), null))).status).toBe(401);
    expect(uploads).toHaveLength(0);
  });

  it("rejects non-image bytes even with an image content type", async () => {
    const { POST } = await import("@/app/api/uploads/logo/route");
    const res = await POST(upload("<svg onload=alert(1)></svg>".padEnd(64, " "), "did:privy:alice", "image/png"));
    expect(res.status).toBe(422);
    expect(uploads).toHaveLength(0);
  });

  it("rejects oversize images", async () => {
    const { POST } = await import("@/app/api/uploads/logo/route");
    const res = await POST(upload(png(256, 256, 1024 * 1024)));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/1 MB/);
  });

  it("rejects non-square and too small images", async () => {
    const { POST } = await import("@/app/api/uploads/logo/route");
    expect((await POST(upload(png(400, 200)))).status).toBe(422);
    expect((await POST(upload(png(64, 64)))).status).toBe(422);
    expect(uploads).toHaveLength(0);
  });

  it("accepts a valid PNG and stores it under the user's folder", async () => {
    const { POST } = await import("@/app/api/uploads/logo/route");
    const res = await POST(upload(png(256, 240)));
    expect(res.status).toBe(200);
    const { url } = await res.json();
    expect(url).toMatch(/^https:\/\/store1\.public\.blob\.vercel-storage\.com\/logos\/did:privy:alice\/[0-9a-f-]{36}\.png$/);
    expect(uploads[0]).toMatchObject({ contentType: "image/png" });
    expect(uploads[0]!.path.startsWith("logos/did:privy:alice/")).toBe(true);
  });

  it("returns 503 when blob storage is not connected", async () => {
    configured = false;
    const { POST } = await import("@/app/api/uploads/logo/route");
    expect((await POST(upload(png(256, 256)))).status).toBe(503);
    expect(uploads).toHaveLength(0);
  });

  it("returns 502 when storage fails", async () => {
    uploadError = new Error("boom");
    const { POST } = await import("@/app/api/uploads/logo/route");
    expect((await POST(upload(png(256, 256)))).status).toBe(502);
  });
});
