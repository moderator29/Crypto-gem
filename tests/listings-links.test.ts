import { describe, expect, it } from "vitest";
import { listingInput, logoUrlAllowed } from "@/lib/listings";
import { checkLogoImage } from "@/lib/logo";

const base = {
  mode: "express" as const,
  network: null,
  address: null,
  package: "pro",
  payCurrency: "usdttrc20",
  form: { website: "", twitter: "", telegram: "", discord: "", medium: "", coingecko: "", coinmarketcap: "", name: "Alpha", symbol: "ALP", description: "A project description that is long enough to pass.", logoUrl: "", email: "a@example.test" },
};
const withForm = (extra: Record<string, unknown>) => ({ ...base, form: { ...base.form, ...extra } });

describe("listing links", () => {
  it("accepts the new optional links and defaults them to empty", () => {
    const ok = listingInput.safeParse(withForm({ zhTelegram: "https://t.me/alpha_cn", btok: "https://btok.example/alpha", weibo: "http://weibo.example/alpha" }));
    expect(ok.success).toBe(true);
    const bare = listingInput.parse(withForm({}));
    expect(bare.form.zhTelegram).toBe("");
    expect(bare.form.btok).toBe("");
    expect(bare.form.weibo).toBe("");
  });

  it.each(["zhTelegram", "btok", "weibo", "website"])("rejects bad schemes for %s", (k) => {
    for (const bad of ["javascript:alert(1)", "ftp://x.example", "data:text/html,hi", "not a url"]) {
      expect(listingInput.safeParse(withForm({ [k]: bad })).success).toBe(false);
    }
  });

  it("rejects links over 300 characters", () => {
    expect(listingInput.safeParse(withForm({ weibo: `https://x.example/${"a".repeat(300)}` })).success).toBe(false);
    expect(listingInput.safeParse(withForm({ weibo: `https://x.example/${"a".repeat(270)}` })).success).toBe(true);
  });
});

describe("logo url rules", () => {
  const BLOB = "https://abc123.public.blob.vercel-storage.com";

  it("allows empty and detected https provider logos, rejects http and junk", () => {
    expect(logoUrlAllowed("", "u1")).toBe(true);
    expect(logoUrlAllowed("https://assets.coingecko.com/coins/images/1/large/a.png", "u1")).toBe(true);
    expect(logoUrlAllowed("http://assets.example/a.png", "u1")).toBe(false);
    expect(logoUrlAllowed("javascript:alert(1)", "u1")).toBe(false);
    expect(logoUrlAllowed(`https://x.example/${"a".repeat(500)}`, "u1")).toBe(false);
  });

  it("only allows own-storage logos from the caller's folder", () => {
    expect(logoUrlAllowed(`${BLOB}/logos/u1/a.png`, "u1")).toBe(true);
    expect(logoUrlAllowed(`${BLOB}/logos/did:privy:alice/a.png`, "did:privy:alice")).toBe(true);
    expect(logoUrlAllowed(`${BLOB}/logos/u2/a.png`, "u1")).toBe(false);
    expect(logoUrlAllowed(`${BLOB}/logos/u10/a.png`, "u1")).toBe(false);
    expect(logoUrlAllowed(`${BLOB}/creatives/u1/a.png`, "u1")).toBe(false);
    expect(logoUrlAllowed(`${BLOB}/other/path.png`, "u1")).toBe(false);
    expect(logoUrlAllowed(`${BLOB}/logos/u1/../u2/a.png`, "u1")).toBe(false);
    expect(logoUrlAllowed(`http://abc123.public.blob.vercel-storage.com/logos/u1/a.png`, "u1")).toBe(false);
  });

  it("treats lookalike hosts as ordinary external logos", () => {
    expect(logoUrlAllowed("https://public.blob.vercel-storage.com.evil.example/logos/u2/a.png", "u1")).toBe(true);
    expect(logoUrlAllowed("https://evil.example/abc.public.blob.vercel-storage.com/logos/u2/a.png", "u1")).toBe(true);
  });

  it("checks logo image shape and size", () => {
    expect(checkLogoImage({ kind: "png", width: 256, height: 256 }, 1000).ok).toBe(true);
    expect(checkLogoImage({ kind: "png", width: 256, height: 200 }, 1000).ok).toBe(false);
    expect(checkLogoImage({ kind: "png", width: 100, height: 100 }, 1000).ok).toBe(false);
    expect(checkLogoImage({ kind: "png", width: 256, height: 256 }, 2 * 1024 * 1024).ok).toBe(false);
    expect(checkLogoImage(null, 10).ok).toBe(false);
  });
});
