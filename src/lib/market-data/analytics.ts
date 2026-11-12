import { assetKey } from "./identifiers";
import { getNetwork } from "./networks";
import type { ChainPulse } from "./pulse";
import type { PoolSummary } from "./types";

/* Pure helpers for the price map, chain race, compare chart and chain pages. No I/O, no clock reads. */

export type ChangeWindow = "h1" | "h6" | "h24";
export type SizeBy = "volume" | "liquidity";

export const WINDOW_LABEL: Record<ChangeWindow, string> = { h1: "1h", h6: "6h", h24: "24h" };

/** Percent move at which a tile reaches full colour, per window. Shorter windows move less. */
const FULL_SCALE: Record<ChangeWindow, number> = { h1: 5, h6: 12, h24: 25 };

/** Percent move that paints a tile at full strength for the window. */
export const fullScale = (w: ChangeWindow): number => FULL_SCALE[w];

export const changeOf = (p: PoolSummary, w: ChangeWindow): number | null => p.change[w];

export function sizeOf(p: PoolSummary, by: SizeBy): number {
  const v = by === "volume" ? p.volumeUsd.h24 : p.liquidityUsd;
  return v !== null && Number.isFinite(v) && v > 0 ? v : 0;
}

export interface Extent { min: number; max: number }

/** Smallest and largest finite value, or null for an empty list. */
export function extent(values: Array<number | null>): Extent | null {
  const xs = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (xs.length === 0) return null;
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

/** Maps a change to -1..1 so colour strength is comparable inside one window. */
export function heatIntensity(change: number, w: ChangeWindow): number {
  return Math.max(-1, Math.min(1, change / FULL_SCALE[w]));
}

export interface MapTile { pool: PoolSummary; size: number; change: number }

/** Tiles for the price map: pools with a size and a change for the chosen window, largest first, optionally on one chain. */
export function mapTiles(pools: PoolSummary[], w: ChangeWindow, by: SizeBy, network: string | null, limit = 40): MapTile[] {
  const seen = new Set<string>();
  const out: MapTile[] = [];
  for (const pool of pools) {
    if (seen.has(pool.id)) continue;
    seen.add(pool.id);
    if (network && pool.networkId !== network) continue;
    const change = changeOf(pool, w);
    const size = sizeOf(pool, by);
    if (change === null || size <= 0) continue;
    out.push({ pool, size, change });
  }
  return out.sort((a, b) => b.size - a.size).slice(0, limit);
}

export type ChainMetric = "volume" | "liquidity" | "newPools" | "buySell";

export const METRIC_LABEL: Record<ChainMetric, string> = { volume: "24h volume", liquidity: "Liquidity", newPools: "New pools", buySell: "Buy/sell ratio" };

export function chainMetricValue(c: ChainPulse, m: ChainMetric): number | null {
  if (m === "volume") return c.volume24hUsd;
  if (m === "liquidity") return c.liquidityUsd;
  if (m === "newPools") return c.newPools;
  return c.buySellRatio;
}

export interface RaceRow { networkId: string; name: string; value: number; share: number; rank: number }

/** Chains ordered by one metric with each bar's share of the leader (0 to 1). Chains without the metric are left out. */
export function rankChains(chains: ChainPulse[], m: ChainMetric, limit = 10): RaceRow[] {
  const rows = chains
    .map((c) => ({ c, v: chainMetricValue(c, m) }))
    .filter((r): r is { c: ChainPulse; v: number } => r.v !== null && Number.isFinite(r.v) && r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, limit);
  const top = rows[0]?.v ?? 0;
  return rows.map((r, i) => ({ networkId: r.c.networkId, name: r.c.name, value: r.v, share: top > 0 ? r.v / top : 0, rank: i + 1 }));
}

/** Buys as a percentage of all trades, from a buys-per-sell ratio. Null when the ratio is unknown. */
export function buyShare(ratio: number | null): number | null {
  if (ratio === null || !Number.isFinite(ratio) || ratio < 0) return null;
  return (ratio / (1 + ratio)) * 100;
}

/** How many times the last hour's volume exceeds the pool's own hourly average over 24h. Null without both figures. */
export function surgeRatio(p: PoolSummary): number | null {
  const h1 = p.volumeUsd.h1;
  const h24 = p.volumeUsd.h24;
  if (h1 === null || h24 === null || h24 <= 0 || h1 < 0) return null;
  return h1 / (h24 / 24);
}

export interface Surge { pool: PoolSummary; ratio: number }

/** Pools whose last hour runs at least `min` times their daily pace, strongest first. */
export function rankSurges(pools: PoolSummary[], min = 2, limit = 8): Surge[] {
  const seen = new Set<string>();
  const out: Surge[] = [];
  for (const pool of pools) {
    if (seen.has(pool.id)) continue;
    seen.add(pool.id);
    const ratio = surgeRatio(pool);
    if (ratio !== null && ratio >= min && (pool.liquidityUsd ?? 0) >= 5_000) out.push({ pool, ratio });
  }
  return out.sort((a, b) => b.ratio - a.ratio).slice(0, limit);
}

export interface Breadth { up: number; down: number; flat: number; total: number }

/** Counts pools up, down and flat (within half a percent) over a window. Pools without a figure are not counted. */
export function marketBreadth(pools: PoolSummary[], w: ChangeWindow = "h24"): Breadth {
  let up = 0;
  let down = 0;
  let flat = 0;
  for (const p of pools) {
    const c = changeOf(p, w);
    if (c === null) continue;
    if (c > 0.5) up++;
    else if (c < -0.5) down++;
    else flat++;
  }
  return { up, down, flat, total: up + down + flat };
}

export interface DexSlice { dex: string; value: number; share: number }

/** Liquidity grouped by DEX, the largest `top` kept and the rest folded into "Other". */
export function liquidityByDex(pools: PoolSummary[], top = 5): DexSlice[] {
  const by = new Map<string, number>();
  for (const p of pools) {
    const liq = p.liquidityUsd ?? 0;
    if (liq <= 0 || !p.dex) continue;
    by.set(p.dex, (by.get(p.dex) ?? 0) + liq);
  }
  const sorted = [...by.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return [];
  const head = sorted.slice(0, top);
  const rest = sorted.slice(top).reduce((s, [, v]) => s + v, 0);
  const rows = rest > 0 ? [...head, ["other", rest] as [string, number]] : head;
  return rows.map(([dex, value]) => ({ dex, value, share: value / total }));
}

/** Turns a provider dex id such as "uniswap_v3" into "Uniswap V3". */
export function dexLabel(id: string): string {
  if (id === "other") return "Other";
  return id.split(/[_-]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Biggest 24h risers and fallers among pools above a liquidity floor. */
export function topMovers(pools: PoolSummary[], n = 6, minLiquidityUsd = 5_000): { up: PoolSummary[]; down: PoolSummary[] } {
  const seen = new Set<string>();
  const liquid = pools.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return p.change.h24 !== null && (p.liquidityUsd ?? 0) >= minLiquidityUsd;
  });
  const up = [...liquid].filter((p) => (p.change.h24 ?? 0) > 0).sort((a, b) => (b.change.h24 ?? 0) - (a.change.h24 ?? 0)).slice(0, n);
  const down = [...liquid].filter((p) => (p.change.h24 ?? 0) < 0).sort((a, b) => (a.change.h24 ?? 0) - (b.change.h24 ?? 0)).slice(0, n);
  return { up, down };
}

/* Compare */

export type CompareMode = "pct" | "index";
export type CompareRange = "24h" | "7d";

export const MAX_COMPARE = 5;
const COMPARE_ADDRESS = /^[A-Za-z0-9_.:-]{10,100}$/;

export interface CompareRef { networkId: string; address: string }

const refKey = (r: CompareRef) => `${r.networkId}:${r.address}`;

/** Reads tokens from `t` (comma separated network:address) and the legacy `a`. Invalid, unknown or repeated entries are dropped. */
export function parseCompareRefs(params: { t?: string | null; a?: string | null }): CompareRef[] {
  const raw = [...(params.t ?? "").split(","), params.a ?? ""].map((s) => s.trim()).filter(Boolean);
  const out: CompareRef[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const i = item.indexOf(":");
    if (i < 1) continue;
    const networkId = item.slice(0, i);
    let address = item.slice(i + 1);
    try {
      address = decodeURIComponent(address);
    } catch {
      continue;
    }
    if (!getNetwork(networkId)?.geckoterminal || !COMPARE_ADDRESS.test(address)) continue;
    const ref = { networkId, address };
    const key = assetKey(networkId, address);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
    if (out.length >= MAX_COMPARE) break;
  }
  return out;
}

/** Query string for a shareable compare view. Empty when nothing is picked. */
export function compareQuery(refs: CompareRef[], mode: CompareMode, range: CompareRange): string {
  if (refs.length === 0) return "";
  const q = new URLSearchParams();
  q.set("t", refs.map(refKey).join(","));
  if (mode !== "pct") q.set("m", mode);
  if (range !== "7d") q.set("r", range);
  return `?${q.toString()}`;
}

export const parseCompareMode = (v: string | null | undefined): CompareMode => (v === "index" ? "index" : "pct");
export const parseCompareRange = (v: string | null | undefined): CompareRange => (v === "24h" ? "24h" : "7d");

/** Percent change of every point from the first point. Empty when the first point is not usable. */
export function toPct(points: number[]): number[] {
  const base = points[0];
  if (base === undefined || !Number.isFinite(base) || base <= 0) return [];
  return points.map((v) => ((v - base) / base) * 100);
}

/** Scales a series so its window low is 0 and its high is 100. A flat series sits at 50. */
export function toIndex(points: number[]): number[] {
  if (points.length === 0) return [];
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  if (hi === lo) return points.map(() => 50);
  return points.map((v) => ((v - lo) / (hi - lo)) * 100);
}

/** The last `n` points. Series shorter than `n` are returned whole. */
export const tail = (points: number[], n: number): number[] => (points.length > n ? points.slice(points.length - n) : points);

/** Points per range: spark candles are 4h (42 per week); 25 hourly closes span a full day. */
export const RANGE_POINTS: Record<CompareRange, number> = { "24h": 25, "7d": 42 };

export interface Extremes { best: number | null; worst: number | null }

/** Positions of the highest and lowest value. Null when fewer than two series have data, so nobody is crowned alone. */
export function extremes(values: Array<number | null>): Extremes {
  const known = values.map((v, i) => ({ v, i })).filter((r): r is { v: number; i: number } => r.v !== null && Number.isFinite(r.v));
  if (known.length < 2) return { best: null, worst: null };
  const sorted = [...known].sort((a, b) => b.v - a.v);
  return { best: sorted[0]?.i ?? null, worst: sorted.at(-1)?.i ?? null };
}

/** Index in each series that sits at the same moment as slot `slot` of a chart `length` slots wide, right aligned. Null before the series starts. */
export function alignedIndex(seriesLength: number, length: number, slot: number): number | null {
  const i = slot - (length - seriesLength);
  return i >= 0 && i < seriesLength ? i : null;
}

/** Each chain's own brand accent. Used only as ambient glow and chart tint, never as a signal for up or down. */
const CHAIN_COLOR: Record<string, string> = { ethereum: "#627eea", solana: "#14f195", bsc: "#f3ba2f", base: "#0052ff", arbitrum: "#28a0f0", optimism: "#ff0420", polygon: "#8247e5", avalanche: "#e84142", ton: "#0098ea", tron: "#ff3b30", sui: "#4da2ff", robinhood: "#9cf200", fantom: "#1969ff", sonic: "#fe9a2e", linea: "#61dfff", zksync: "#8c8dfc", scroll: "#ffeeda", mantle: "#65b3ae", blast: "#fcfc03", celo: "#fcff52", aptos: "#2dd8a7", near: "#00ec97" };

export const chainColor = (networkId: string): string => CHAIN_COLOR[networkId] ?? "var(--brand)";

export interface HistBin { label: string; count: number; tone: "down" | "flat" | "up" }

const BINS: Array<{ label: string; lo: number; hi: number; tone: HistBin["tone"] }> = [
  { label: "<-20%", lo: -Infinity, hi: -20, tone: "down" },
  { label: "-20 to -5", lo: -20, hi: -5, tone: "down" },
  { label: "-5 to -1", lo: -5, hi: -1, tone: "down" },
  { label: "-1 to 1", lo: -1, hi: 1, tone: "flat" },
  { label: "1 to 5", lo: 1, hi: 5, tone: "up" },
  { label: "5 to 20", lo: 5, hi: 20, tone: "up" },
  { label: ">20%", lo: 20, hi: Infinity, tone: "up" },
];

/** How many pools fall in each band of change over a window. Pools without a figure are skipped. */
export function changeHistogram(pools: PoolSummary[], w: ChangeWindow = "h24"): HistBin[] {
  const counts = BINS.map(() => 0);
  for (const p of pools) {
    const c = changeOf(p, w);
    if (c === null) continue;
    const i = BINS.findIndex((b) => c >= b.lo && c < b.hi);
    if (i >= 0) counts[i] = (counts[i] ?? 0) + 1;
  }
  return BINS.map((b, i) => ({ label: b.label, count: counts[i] ?? 0, tone: b.tone }));
}

/** Pools whose name, symbol or address contains the query. An empty query keeps everything. */
export function matchesQuery(p: PoolSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const t = p.baseToken;
  return t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q) || t.address.toLowerCase().startsWith(q);
}

/** True when the pool was created within `hours`. Pools with no creation time are never new. */
export function isFresh(p: PoolSummary, hours = 48, now = Date.now()): boolean {
  if (!p.createdAt) return false;
  const t = Date.parse(p.createdAt);
  return Number.isFinite(t) && now - t >= 0 && now - t < hours * 3_600_000;
}

/** Each chain's share of the summed 24h volume, largest first, so a stacked bar always adds to 100. */
export function volumeShares(chains: ChainPulse[], top = 6): Array<{ networkId: string; name: string; share: number }> {
  const total = chains.reduce((s, c) => s + c.volume24hUsd, 0);
  if (total <= 0) return [];
  const sorted = [...chains].sort((a, b) => b.volume24hUsd - a.volume24hUsd);
  const head = sorted.slice(0, top).map((c) => ({ networkId: c.networkId, name: c.name, share: c.volume24hUsd / total }));
  const rest = sorted.slice(top).reduce((s, c) => s + c.volume24hUsd, 0) / total;
  return rest > 0 ? [...head, { networkId: "other", name: "Other chains", share: rest }] : head;
}
