import { describe, expect, it } from "vitest";
import { compareSubmission } from "@/lib/admin/compare";

const row = (r: ReturnType<typeof compareSubmission>, field: string) => r.rows.find((x) => x.field === field)!;

describe("submission versus detected snapshot", () => {
  it("marks matches, differences and one-sided fields, keeping the provider source", () => {
    const res = compareSubmission({
      name: "Alpha", symbol: "ALP", network_id: "ethereum", address: "0xabc0000000000000000000000000000000000001",
      links: { website: "https://alpha.io/", twitter: "https://x.com/alpha" },
      detected: {
        name: { value: "alpha", source: "geckoterminal" },
        symbol: { value: "ALPHA", source: "coingecko" },
        address: "0xABC0000000000000000000000000000000000001",
        website: { value: "https://alpha.io", source: "coingecko" },
        discord: { value: "https://discord.gg/alpha", source: "coingecko" },
      },
    });
    expect(res.hasSnapshot).toBe(true);
    expect(row(res, "Name")).toMatchObject({ verdict: "match", source: "geckoterminal" });
    expect(row(res, "Symbol").verdict).toBe("differs");
    expect(row(res, "Contract address").verdict).toBe("match");
    expect(row(res, "Website").verdict).toBe("match");
    expect(row(res, "Twitter").verdict).toBe("owner_only");
    expect(row(res, "Discord").verdict).toBe("detected_only");
    expect(row(res, "Telegram").verdict).toBe("both_empty");
  });

  it("does not treat Solana addresses as case-insensitive", () => {
    const res = compareSubmission({ address: "MintAbC", detected: { address: "mintabc" } });
    expect(row(res, "Contract address").verdict).toBe("differs");
  });

  it("is honest when no snapshot was stored", () => {
    const res = compareSubmission({ name: "Alpha", symbol: "ALP", detected: null });
    expect(res.hasSnapshot).toBe(false);
    expect(row(res, "Name")).toMatchObject({ verdict: "owner_only", detected: null });
  });
});
