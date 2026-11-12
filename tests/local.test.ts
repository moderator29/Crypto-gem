import { beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  data = new Map<string, string>();
  broken = false;
  getItem(k: string) {
    if (this.broken) throw new Error("blocked");
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.broken) throw new Error("blocked");
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const storage = new MemoryStorage();
vi.stubGlobal("window", { localStorage: storage, addEventListener: () => undefined, removeEventListener: () => undefined });

const { watchlistStore, addToWatchlist, isWatched, toggleWatchlist, removeFromWatchlist } = await import("@/lib/local/watchlist");
const { notificationsStore, pushLocalNotification, markAllLocalNotificationsRead } = await import("@/lib/local/notifications");
const { receiptsStore, saveLocalReceipt, receiptTime } = await import("@/lib/local/receipts");
const { alertsStore, addLocalAlert, crossed } = await import("@/lib/local/alerts");
const { toggleStar, isStarred, starsStore } = await import("@/lib/local/stars");
const { boostCheckoutHref, listingCheckoutHref, bannerCheckoutHref, telegramHandle } = await import("@/lib/local/checkout");

beforeEach(() => {
  storage.data.clear();
  storage.broken = false;
  for (const s of [watchlistStore, notificationsStore, receiptsStore, alertsStore, starsStore]) s.refresh();
});

describe("local watchlist", () => {
  it("adds, dedupes EVM addresses case-insensitively, and removes", () => {
    addToWatchlist({ network: "eth", address: "0xAbCdEf0000000000000000000000000000000001", symbol: "ABC", name: "Abc", logo: null });
    addToWatchlist({ network: "eth", address: "0xabcdef0000000000000000000000000000000001", symbol: "ABC", name: "Abc", logo: "https://x/l.png" });
    expect(watchlistStore.read()).toHaveLength(1);
    expect(isWatched("eth", "0xABCDEF0000000000000000000000000000000001")).toBe(true);
    removeFromWatchlist("eth", "0xabcdef0000000000000000000000000000000001");
    expect(watchlistStore.read()).toHaveLength(0);
  });

  it("keeps Solana addresses case-sensitive", () => {
    toggleWatchlist({ network: "solana", address: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Wrapped SOL", logo: null });
    expect(isWatched("solana", "so11111111111111111111111111111111111111112")).toBe(false);
    expect(toggleWatchlist({ network: "solana", address: "So11111111111111111111111111111111111111112", symbol: "SOL", name: "Wrapped SOL", logo: null })).toBe(false);
  });

  it("persists to localStorage and survives a reload of the cache", () => {
    addToWatchlist({ network: "base", address: "0x0000000000000000000000000000000000000002", symbol: "B", name: "B", logo: null });
    watchlistStore.refresh();
    expect(watchlistStore.read()[0]?.symbol).toBe("B");
  });

  it("ignores corrupt storage and keeps working in memory when storage is blocked", () => {
    storage.data.set("cg:watchlist", "{not json");
    watchlistStore.refresh();
    expect(watchlistStore.read()).toEqual([]);
    storage.broken = true;
    addToWatchlist({ network: "base", address: "0x0000000000000000000000000000000000000003", symbol: "C", name: "C", logo: null });
    expect(watchlistStore.read()).toHaveLength(1);
    expect(watchlistStore.persisted()).toBe(false);
  });
});

describe("local notifications and receipts", () => {
  it("pushes notifications newest first, normalises kind and rejects external links", () => {
    pushLocalNotification({ kind: "payment", title: "Paid", href: "/receipt/1" });
    pushLocalNotification({ kind: "weird", title: "Other", href: "https://evil.example" });
    const [a, b] = notificationsStore.read();
    expect(a?.kind).toBe("info");
    expect(a?.href).toBeNull();
    expect(b?.href).toBe("/receipt/1");
    markAllLocalNotificationsRead();
    expect(notificationsStore.read().every((n) => n.read)).toBe(true);
  });

  it("saves receipts under cg:receipts and replaces by number", () => {
    saveLocalReceipt({ number: "R1", href: "/checkout/receipt?n=R1", title: "Boost", amount: 100, asset: "USDT", at: "2026-11-01T00:00:00Z" });
    saveLocalReceipt({ number: "R1", href: "/checkout/receipt?n=R1", title: "Boost", amount: "100.5", asset: "USDT", at: 1 });
    expect(receiptsStore.read()).toHaveLength(1);
    expect(JSON.parse(storage.data.get("cg:receipts") ?? "[]")).toHaveLength(1);
    expect(receiptTime({ at: "2026-11-01T00:00:00Z" })).toBe(Date.parse("2026-11-01T00:00:00Z"));
  });
});

describe("local alerts", () => {
  it("crosses only in the chosen direction and never on a missing price", () => {
    expect(crossed({ direction: "above", price: 2 }, 2)).toBe(true);
    expect(crossed({ direction: "above", price: 2 }, 1.9)).toBe(false);
    expect(crossed({ direction: "below", price: 2 }, 1.5)).toBe(true);
    expect(crossed({ direction: "below", price: 2 }, null)).toBe(false);
  });

  it("stores new alerts as watching", () => {
    const a = addLocalAlert({ network: "eth", address: "0x0000000000000000000000000000000000000004", symbol: "D", name: "D", logo: null, direction: "above", price: 1 });
    expect(a.firedAt).toBeNull();
    expect(alertsStore.read()[0]?.id).toBe(a.id);
  });
});

describe("stars and checkout links", () => {
  it("toggles a local star without any count", () => {
    expect(toggleStar("eth:0x1")).toBe(true);
    expect(isStarred("eth:0x1")).toBe(true);
    expect(toggleStar("eth:0x1")).toBe(false);
  });

  it("builds encoded checkout links and drops empty optional values", () => {
    const boost = new URL(boostCheckoutHref({ pack: "surge", network: "solana", address: "Mint111", name: "A & B", symbol: "A/B" }), "https://x");
    expect(boost.pathname).toBe("/checkout");
    expect(Object.fromEntries(boost.searchParams)).toEqual({ kind: "boost", pack: "surge", network: "solana", address: "Mint111", name: "A & B", symbol: "A/B" });
    const listing = new URL(listingCheckoutHref({ pkg: "pro", name: "Gem", symbol: "GEM", network: null, address: "", telegram: "gemhq" }), "https://x");
    expect(Object.fromEntries(listing.searchParams)).toEqual({ kind: "listing", package: "pro", name: "Gem", symbol: "GEM", telegram: "gemhq" });
    const banner = new URL(bannerCheckoutHref({ placement: "hero", days: 3, start: "2026-12-01", name: "Gem", url: "https://gem.io/?a=1&b=2" }), "https://x");
    expect(banner.searchParams.get("url")).toBe("https://gem.io/?a=1&b=2");
    expect(banner.searchParams.get("days")).toBe("3");
  });

  it("reads a Telegram handle from links and @names", () => {
    expect(telegramHandle("https://t.me/gem_hq")).toBe("gem_hq");
    expect(telegramHandle("@gem_hq")).toBe("gem_hq");
    expect(telegramHandle("t.me/gem_hq/")).toBe("gem_hq");
    expect(telegramHandle("https://example.com/x")).toBeNull();
    expect(telegramHandle("")).toBeNull();
  });
});
