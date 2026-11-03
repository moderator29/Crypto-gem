/**
 * Placement catalog and DEFAULT price book. These are the initial commercial
 * values from the product brief. At runtime the admin-managed rows in
 * `advertising_placements` override them; until Supabase is configured this
 * file is the source so the marketplace can still describe inventory honestly.
 */
export type PlacementId = "hero" | "featured" | "side" | "trending" | "new-listings" | "hot-pairs" | "market" | "token-page" | "ecosystem";

export interface Placement {
  id: PlacementId;
  name: string;
  blurb: string;
  where: string;
  desktop: { w: number; h: number };
  mobile: { w: number; h: number };
  /** USD price by campaign length in days. */
  prices: Partial<Record<1 | 3 | 7 | 14 | 30, number>>;
  exclusive: boolean;
  slots: number;
}

export const PLACEMENTS: Placement[] = [
  { id: "hero", name: "Homepage Hero", blurb: "The first thing every visitor sees. Large rotating banner at the top of Discover.", where: "Discover, top of page", desktop: { w: 1600, h: 500 }, mobile: { w: 960, h: 540 }, prices: { 1: 350, 3: 945, 7: 1540 }, exclusive: false, slots: 5 },
  { id: "featured", name: "Featured Banner", blurb: "Wide banner below the hero for projects that want prominence without the hero slot.", where: "Discover, below hero", desktop: { w: 1200, h: 300 }, mobile: { w: 960, h: 400 }, prices: { 1: 250, 3: 675, 7: 1190 }, exclusive: false, slots: 4 },
  { id: "side", name: "Side Banner", blurb: "Rotating card beside the trending list. Shared rotation across advertisers.", where: "Discover, beside trending", desktop: { w: 600, h: 600 }, mobile: { w: 960, h: 400 }, prices: { 1: 200, 3: 540, 7: 980 }, exclusive: false, slots: 6 },
  { id: "trending", name: "Trending Sponsorship", blurb: "Clearly labelled sponsored slots next to the trending list. Never mixed into organic rank.", where: "Discover, trending", desktop: { w: 640, h: 200 }, mobile: { w: 640, h: 200 }, prices: { 1: 500, 3: 1350, 7: 2450 }, exclusive: true, slots: 10 },
  { id: "new-listings", name: "New Listings Sponsorship", blurb: "Extra exposure alongside freshly listed projects.", where: "Discover, freshly launched", desktop: { w: 640, h: 200 }, mobile: { w: 640, h: 200 }, prices: { 1: 250, 3: 675, 7: 1190 }, exclusive: false, slots: 6 },
  { id: "hot-pairs", name: "Hot Pairs Sponsorship", blurb: "Advertise around newly created liquidity pools.", where: "Discover, new pairs", desktop: { w: 640, h: 200 }, mobile: { w: 640, h: 200 }, prices: { 1: 250, 3: 675, 7: 1190 }, exclusive: false, slots: 6 },
  { id: "token-page", name: "Token Page Ad", blurb: "Contextual placement on token detail pages.", where: "Token detail, sidebar", desktop: { w: 600, h: 400 }, mobile: { w: 960, h: 400 }, prices: { 1: 150, 3: 405, 7: 735 }, exclusive: false, slots: 4 },
  { id: "ecosystem", name: "Ecosystem Spotlight", blurb: "Own the spotlight for one chain: Solana, Base, BNB Chain and more.", where: "Discover, chain filtered", desktop: { w: 1200, h: 300 }, mobile: { w: 960, h: 400 }, prices: { 1: 300, 3: 810, 7: 1470 }, exclusive: true, slots: 1 },
];

export function getPlacement(id: string): Placement | undefined {
  return PLACEMENTS.find((p) => p.id === id);
}

/** Discount shown versus paying the 1-day rate every day. */
export function discount(p: Placement, days: 1 | 3 | 7 | 14 | 30): { original: number; final: number; pct: number } | null {
  const one = p.prices[1];
  const final = p.prices[days];
  if (one === undefined || final === undefined) return null;
  const original = one * days;
  return { original, final, pct: original > 0 ? Math.round((1 - final / original) * 100) : 0 };
}

export const BOOST_PACKS = [
  { id: "spark", name: "Spark", credits: 50, hours: 6, priceUsd: 30, label: null },
  { id: "ignite", name: "Ignite", credits: 100, hours: 12, priceUsd: 50, label: null },
  { id: "surge", name: "Surge", credits: 200, hours: 24, priceUsd: 100, label: "Popular" },
  { id: "momentum", name: "Momentum", credits: 350, hours: 48, priceUsd: 175, label: "Best Value" },
  { id: "dominance", name: "Dominance", credits: 500, hours: 72, priceUsd: 250, label: "Premium" },
] as const;

export const LISTING_PACKAGES = [
  { id: "starter", name: "Starter", priceUsd: 300, perks: ["Express listing review", "Contract info verified where independently confirmed", "Published project page after approval", "Discoverable through search", "Standard listing placement"] },
  { id: "pro", name: "Pro", priceUsd: 700, perks: ["Everything in Starter", "Featured New Listings placement", "Scheduled promotional visibility", "Additional discovery placements", "Campaign performance reporting"] },
  { id: "premium", name: "Premium", priceUsd: 1000, perks: ["Everything in Pro", "Homepage spotlight allocation", "Priority campaign scheduling", "Extra banner or featured allocation", "Enhanced campaign analytics"] },
] as const;
