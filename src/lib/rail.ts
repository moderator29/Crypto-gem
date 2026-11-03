import { BOOST_PACKS, PLACEMENTS } from "@/lib/ads/catalog";
import type { ActiveCampaign } from "@/lib/ads/delivery";
import type { HomeData } from "@/lib/market-data/home";
import type { ChainPulse } from "@/lib/market-data/pulse";
import type { PoolSummary } from "@/lib/market-data/types";
import { getNetwork } from "@/lib/market-data/networks";
import { ageShort, pct, usdCompact } from "@/lib/utils/format";

export type RailKind = "market" | "sponsored" | "platform";
export type RailTone = "up" | "down" | "brand" | "warm";
export type RailIcon = "trend" | "flame" | "spark" | "chain" | "rocket" | "bot" | "plus" | "megaphone" | "activity";

/** Serializable card model. Every field comes from measured data, a real campaign, or a real product fact. */
export interface RailItem {
  id: string;
  kind: RailKind;
  tone: RailTone;
  icon: RailIcon;
  eyebrow: string;
  title: string;
  value?: string;
  sub?: string;
  href: string;
  imageUrl?: string | null;
  tokenLogo?: string | null;
  tokenNetwork?: string;
  tokenAddress?: string;
  cta?: string;
  /** An unsold placement. Rendered as an invitation, never as an advertiser. */
  available?: boolean;
}

const MIN_LIQ = 25_000;
const MIN_VOL = 25_000;

const tokenHref = (p: PoolSummary) => `/token/${p.networkId}/${p.baseToken.address}`;
const chainName = (p: PoolSummary) => getNetwork(p.networkId)?.name ?? p.networkId;

function marketItems(data: HomeData, chains: ChainPulse[], now: number): RailItem[] {
  const out: RailItem[] = [];
  const pool = (p: PoolSummary, id: string, eyebrow: string, tone: RailTone, icon: RailIcon, value: string, sub: string): RailItem => ({ id, kind: "market", tone, icon, eyebrow, title: p.baseToken.symbol || p.baseToken.name, value, sub, href: tokenHref(p), tokenLogo: p.baseToken.imageUrl, tokenNetwork: p.networkId, tokenAddress: p.baseToken.address });

  const liquid = [...data.organic, ...data.fresh, ...data.gainers, ...data.losers, ...data.volume].filter((p) => (p.liquidityUsd ?? 0) >= MIN_LIQ && (p.volumeUsd.h24 ?? 0) >= MIN_VOL && p.change.h24 !== null);
  const uniq = [...new Map(liquid.map((p) => [p.id, p])).values()];

  const up = [...uniq].sort((a, b) => (b.change.h24 ?? 0) - (a.change.h24 ?? 0))[0];
  if (up && (up.change.h24 ?? 0) > 0) out.push(pool(up, `mover-${up.id}`, "Top mover, 24h", "up", "trend", pct(up.change.h24), `${chainName(up)} · ${usdCompact(up.liquidityUsd)} liquidity`));

  const heat = data.heating[0];
  if (heat) out.push(pool(heat.pool, `heat-${heat.pool.id}`, "Volume surge", "warm", "flame", `${heat.ratio.toFixed(1)}x`, `${chainName(heat.pool)} · hourly volume vs 24h pace`));

  const fresh = [...data.fresh].filter((p) => (p.liquidityUsd ?? 0) >= 10_000 && p.createdAt).sort((a, b) => Date.parse(b.createdAt!) - Date.parse(a.createdAt!))[0];
  if (fresh) out.push(pool(fresh, `new-${fresh.id}`, "New pair", "brand", "spark", ageShort(fresh.createdAt, now) + " old", `${chainName(fresh)} · ${usdCompact(fresh.liquidityUsd)} liquidity`));

  const vol = [...uniq].sort((a, b) => (b.volumeUsd.h24 ?? 0) - (a.volumeUsd.h24 ?? 0))[0];
  if (vol) out.push(pool(vol, `vol-${vol.id}`, "Volume leader", "brand", "activity", usdCompact(vol.volumeUsd.h24), `${chainName(vol)} · 24h volume`));

  const down = [...uniq].sort((a, b) => (a.change.h24 ?? 0) - (b.change.h24 ?? 0))[0];
  if (down && (down.change.h24 ?? 0) < 0) out.push(pool(down, `drop-${down.id}`, "Biggest decline, 24h", "down", "trend", pct(down.change.h24), `${chainName(down)} · ${usdCompact(down.liquidityUsd)} liquidity`));

  const lead = chains[0];
  if (lead) out.push({ id: `chain-${lead.networkId}`, kind: "market", tone: "brand", icon: "chain", eyebrow: "Most active chain", title: lead.name, value: usdCompact(lead.volume24hUsd), sub: `${lead.pools} pools sampled · 24h volume`, href: `/chains/${lead.networkId}` });

  const strong = [...chains].filter((c) => c.pools >= 3 && c.medianChange24h !== null).sort((a, b) => (b.medianChange24h ?? 0) - (a.medianChange24h ?? 0))[0];
  if (strong && strong.networkId !== lead?.networkId && (strong.medianChange24h ?? 0) > 0) out.push({ id: `strong-${strong.networkId}`, kind: "market", tone: "up", icon: "chain", eyebrow: "Strongest chain", title: strong.name, value: pct(strong.medianChange24h), sub: `Median 24h change, ${strong.pools} pools`, href: `/chains/${strong.networkId}` });
  return out;
}

function platformItems(): RailItem[] {
  const minBoost = Math.min(...BOOST_PACKS.map((b) => b.priceUsd));
  const minAd = Math.min(...PLACEMENTS.flatMap((p) => Object.values(p.prices).filter((v): v is number => typeof v === "number")));
  return [
    { id: "p-boost", kind: "platform", tone: "brand", icon: "rocket", eyebrow: "Boost", title: "Boost a listed project", sub: `Sponsored visibility from $${minBoost}`, href: "/boost", cta: "Choose a pack" },
    { id: "p-list", kind: "platform", tone: "brand", icon: "plus", eyebrow: "Listings", title: "List your token", sub: "Paste a contract. We detect the rest.", href: "/add-coin", cta: "Start listing" },
    { id: "p-copilot", kind: "platform", tone: "brand", icon: "bot", eyebrow: "AI Copilot", title: "Research any token", sub: "Answers from live market data", href: "/copilot", cta: "Open Copilot" },
    { id: "p-pulse", kind: "platform", tone: "brand", icon: "activity", eyebrow: "Market Pulse", title: "Where activity concentrates", sub: "Chain heatmap and unusual volume", href: "/pulse", cta: "See the pulse" },
    { id: "p-ads", kind: "platform", tone: "brand", icon: "megaphone", eyebrow: "Advertise", title: "Reach active traders", sub: `Placements from $${minAd}`, href: "/promotion", cta: "View placements" },
  ];
}

function sponsoredItems(campaigns: ActiveCampaign[]): RailItem[] {
  const live: RailItem[] = campaigns.map((c) => ({ id: `s-${c.id}`, kind: "sponsored", tone: "warm", icon: "megaphone", eyebrow: "Sponsored", title: c.headline ?? c.projectName, href: `/api/ads/click?c=${c.id}`, imageUrl: c.creativeMobile ?? c.creativeDesktop }));
  // Unsold inventory is shown as an invitation, clearly not an advertiser.
  const hero = PLACEMENTS.find((p) => p.id === "hero");
  const from = hero ? Math.min(...Object.values(hero.prices).filter((v): v is number => typeof v === "number")) : 0;
  const open: RailItem = { id: "s-open-hero", kind: "sponsored", tone: "warm", icon: "megaphone", eyebrow: "Sponsored placement", title: "Your project here", sub: `Homepage hero from $${from}`, href: "/promotion/book?placement=hero", cta: "Reserve", available: true };
  return live.length >= 2 ? live : [...live, open];
}

/** Repeating pattern so card types never clump: market, market, sponsored, market, platform, ... */
const PATTERN = "MMSMPMSMP";

export function buildRailItems(input: { data: HomeData | null; chains: ChainPulse[]; campaigns: ActiveCampaign[]; now?: number }): RailItem[] {
  const queues: Record<"M" | "S" | "P", RailItem[]> = { M: input.data ? marketItems(input.data, input.chains, input.now ?? Date.now()) : [], S: sponsoredItems(input.campaigns), P: platformItems() };
  const out: RailItem[] = [];
  let guard = 0;
  while ((queues.M.length || queues.S.length || queues.P.length) && guard++ < 200) {
    for (const k of PATTERN) {
      const next = queues[k as "M" | "S" | "P"].shift();
      if (next) out.push(next);
    }
  }
  return out;
}
