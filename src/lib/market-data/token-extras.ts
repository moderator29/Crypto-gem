import { cached } from "./cache";
import { ProviderError } from "./errors";
import { fetchJson } from "./http";
import { sameAddress } from "./identifiers";
import type { Candle } from "./types";

const PROVIDER = "geckoterminal";
const PUBLIC_BASE = "https://api.geckoterminal.com/api/v2";
const PRO_BASE = "https://pro-api.coingecko.com/api/v3/onchain";
const VERSION_HEADER = { Accept: "application/json;version=20230302" };

/** Same selection rule as the GeckoTerminal provider: the pro host is used only when a paid key is configured. */
function endpoint(): { base: string; headers: Record<string, string>; paid: boolean } {
  const key = process.env.GECKOTERMINAL_API_KEY || (process.env.COINGECKO_API_PLAN === "pro" ? process.env.COINGECKO_API_KEY : "");
  if (key) return { base: PRO_BASE, headers: { ...VERSION_HEADER, "x-cg-pro-api-key": key }, paid: true };
  return { base: PUBLIC_BASE, headers: VERSION_HEADER, paid: false };
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ───────────────────────── Indicators and candle maths ───────────────────────── */

/** Simple moving average. Entries before the first full window are null so the output lines up with the input. */
export function sma(values: number[], n: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (!Number.isInteger(n) || n < 1 || values.length < n) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    if (i >= n) sum -= values[i - n] ?? 0;
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

/** Exponential moving average seeded with the SMA of the first window. Entries before it are null. */
export function ema(values: number[], n: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (!Number.isInteger(n) || n < 1 || values.length < n) return out;
  const k = 2 / (n + 1);
  let prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i++) {
    prev = (values[i] ?? prev) * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Pairs candle times with indicator values and drops the null warm-up entries. */
export function toLineData(candles: Candle[], values: Array<number | null>): Array<{ time: number; value: number }> {
  const out: Array<{ time: number; value: number }> = [];
  for (let i = 0; i < candles.length; i++) {
    const v = values[i];
    const c = candles[i];
    if (v !== null && v !== undefined && c) out.push({ time: c.time, value: v });
  }
  return out;
}

/**
 * Converts price candles to estimated market cap candles by scaling OHLC with the current fdv/price ratio.
 * Volume is left alone. A non positive or non finite ratio yields no candles rather than invented values.
 */
export function mapMc(candles: Candle[], ratio: number): Candle[] {
  if (!Number.isFinite(ratio) || ratio <= 0) return [];
  return candles.map((c) => ({ ...c, open: c.open * ratio, high: c.high * ratio, low: c.low * ratio, close: c.close * ratio }));
}

/** High and low across the 24 hours that end at the newest candle. Null when there are no candles. */
export function priceLevels(candles: Candle[]): { high: number; low: number; candles: number } | null {
  const last = candles.at(-1);
  if (!last) return null;
  const from = last.time - 86_400;
  const win = candles.filter((c) => c.time > from);
  if (win.length === 0) return null;
  return { high: Math.max(...win.map((c) => c.high)), low: Math.min(...win.map((c) => c.low)), candles: win.length };
}

/** Where a price sits inside a low to high range, as 0 to 1. Null when the range has no width. */
export function rangePosition(price: number | null, low: number, high: number): number | null {
  if (price === null || !Number.isFinite(price) || !(high > low)) return null;
  return Math.min(1, Math.max(0, (price - low) / (high - low)));
}

/** Percent change from a candle's open to its close, used by the crosshair readout. */
export function candleChangePct(c: Pick<Candle, "open" | "close">): number | null {
  return c.open > 0 ? ((c.close - c.open) / c.open) * 100 : null;
}

/* ───────────────────────────── Trades ───────────────────────────── */

export interface Trade {
  time: number;
  kind: "buy" | "sell";
  volumeUsd: number | null;
  priceUsd: number | null;
  tx: string;
  wallet: string;
}

export interface TradeSummary {
  buys: number;
  sells: number;
  total: number;
  /** Buys as a share of all trades, 0 to 100. Null with no trades. */
  buyShare: number | null;
  buyVolumeUsd: number;
  sellVolumeUsd: number;
}

/** Counts and volume of a trade sample. This describes the sample given, not the whole market. */
export function summariseTrades(trades: Trade[]): TradeSummary {
  let buys = 0;
  let sells = 0;
  let buyVolumeUsd = 0;
  let sellVolumeUsd = 0;
  for (const t of trades) {
    if (t.kind === "buy") {
      buys += 1;
      buyVolumeUsd += t.volumeUsd ?? 0;
    } else {
      sells += 1;
      sellVolumeUsd += t.volumeUsd ?? 0;
    }
  }
  const total = buys + sells;
  return { buys, sells, total, buyShare: total ? (buys / total) * 100 : null, buyVolumeUsd, sellVolumeUsd };
}

/** First five and last four characters, so a wallet is recognisable without taking a whole line. */
export function shortWallet(a: string): string {
  return a.length > 12 ? `${a.slice(0, 5)}..${a.slice(-4)}` : a;
}

interface RawTrade {
  attributes?: Record<string, unknown>;
}

/** Normalises GeckoTerminal trade rows. `invert` is for tokens that are the quote side of the pool: buy and sell swap and the other price applies. */
export function normalizeTrades(raw: { data?: RawTrade[] }, invert = false): Trade[] {
  const out: Trade[] = [];
  for (const row of raw.data ?? []) {
    const a = row.attributes ?? {};
    const kind = a.kind === "buy" || a.kind === "sell" ? a.kind : null;
    const ts = typeof a.block_timestamp === "string" ? Date.parse(a.block_timestamp) : NaN;
    const tx = typeof a.tx_hash === "string" ? a.tx_hash : "";
    if (!kind || !Number.isFinite(ts) || !tx) continue;
    const baseSide = kind === "buy" ? num(a.price_to_in_usd) : num(a.price_from_in_usd);
    const quoteSide = kind === "buy" ? num(a.price_from_in_usd) : num(a.price_to_in_usd);
    out.push({
      time: Math.floor(ts / 1000),
      kind: invert ? (kind === "buy" ? "sell" : "buy") : kind,
      volumeUsd: num(a.volume_in_usd),
      priceUsd: invert ? quoteSide : baseSide,
      tx,
      wallet: typeof a.tx_from_address === "string" ? shortWallet(a.tx_from_address) : "",
    });
  }
  return out.sort((x, y) => y.time - x.time);
}

/** Latest swaps for a pool, newest first. Cached for 20 seconds. */
export async function getTrades(geckoNetwork: string, poolAddress: string, invert = false): Promise<Trade[]> {
  const { base, headers } = endpoint();
  const path = `/networks/${geckoNetwork}/pools/${encodeURIComponent(poolAddress)}/trades`;
  const res = await cached(`gt:${path}`, 20_000, () => fetchJson<{ data?: RawTrade[] }>(`${base}${path}`, { provider: PROVIDER, headers }), { staleMs: 120_000 });
  return normalizeTrades(res.value, invert);
}

/* ───────────────────────────── Holders ───────────────────────────── */

export interface Holder {
  rank: number;
  address: string;
  label: string | null;
  percent: number | null;
  valueUsd: number | null;
}

export type HoldersResult = { available: false; reason: "needs_key" | "unsupported" | "unavailable" } | { available: true; holders: Holder[] };

/** Parses the top holders payload defensively: unknown shapes produce an empty list, never made up rows. */
export function normalizeHolders(raw: unknown): Holder[] {
  const list = (raw as { data?: { attributes?: { holders?: unknown } } } | null)?.data?.attributes?.holders;
  if (!Array.isArray(list)) return [];
  const out: Holder[] = [];
  for (const [i, h] of list.entries()) {
    const r = h as Record<string, unknown>;
    const address = typeof r.address === "string" ? r.address : "";
    if (!address) continue;
    out.push({ rank: num(r.rank) ?? i + 1, address, label: typeof r.label === "string" && r.label ? r.label : null, percent: num(r.percentage), valueUsd: num(r.value) });
  }
  return out;
}

/** Top holders need a paid GeckoTerminal or CoinGecko pro key. Without one this reports unavailable instead of guessing. */
export async function getHolders(geckoNetwork: string, address: string): Promise<HoldersResult> {
  const { base, headers, paid } = endpoint();
  if (!paid) return { available: false, reason: "needs_key" };
  const path = `/networks/${geckoNetwork}/tokens/${encodeURIComponent(address)}/top_holders?holders=20`;
  try {
    const res = await cached(`gt:${path}`, 120_000, () => fetchJson<unknown>(`${base}${path}`, { provider: PROVIDER, headers }), { staleMs: 600_000 });
    return { available: true, holders: normalizeHolders(res.value) };
  } catch (err) {
    if (err instanceof ProviderError && (err.kind === "unauthorized" || err.kind === "not_found")) return { available: false, reason: "unsupported" };
    return { available: false, reason: "unavailable" };
  }
}

/* ───────────────────────────── Pool pair price ───────────────────────────── */

export interface PairPrice {
  symbol: string;
  price: number;
}

/** Price of the token in the other side of its top pool (SOL, ETH, WETH and so on), straight from the pool attributes. */
export async function getPairPrice(geckoNetwork: string, poolAddress: string, tokenAddress: string): Promise<PairPrice | null> {
  const { base, headers } = endpoint();
  const path = `/networks/${geckoNetwork}/pools/${encodeURIComponent(poolAddress)}?include=base_token,quote_token`;
  try {
    const res = await cached(`gt:${path}`, 60_000, () => fetchJson<{ data?: { attributes?: Record<string, unknown>; relationships?: Record<string, { data?: { id: string } | null }> }; included?: Array<{ id: string; attributes?: Record<string, unknown> }> }>(`${base}${path}`, { provider: PROVIDER, headers }), { staleMs: 600_000 });
    const a = res.value.data?.attributes ?? {};
    const byId = new Map((res.value.included ?? []).map((t) => [t.id, { address: String(t.attributes?.address ?? ""), symbol: String(t.attributes?.symbol ?? "") }]));
    const rel = res.value.data?.relationships ?? {};
    const baseTok = byId.get(rel.base_token?.data?.id ?? "");
    const quoteTok = byId.get(rel.quote_token?.data?.id ?? "");
    if (!baseTok || !quoteTok) return null;
    const mineIsBase = sameAddress(baseTok.address, tokenAddress);
    const mineIsQuote = sameAddress(quoteTok.address, tokenAddress);
    if (mineIsBase) {
      const p = num(a.base_token_price_quote_token);
      return p !== null && quoteTok.symbol ? { symbol: quoteTok.symbol, price: p } : null;
    }
    if (mineIsQuote) {
      const p = num(a.quote_token_price_base_token);
      return p !== null && baseTok.symbol ? { symbol: baseTok.symbol, price: p } : null;
    }
    return null;
  } catch {
    return null;
  }
}

/* ───────────────────────────── Health strip ───────────────────────────── */

export type MeterTone = "brand" | "up" | "down" | "warm";

export interface HealthMeter {
  id: "depth" | "buyShare" | "turnover" | "age";
  label: string;
  /** Fill, 0 to 100. Null when the inputs are missing, so the meter shows a no-value dash. */
  value: number | null;
  display: string;
  tone: MeterTone;
  tip: string;
}

export interface HealthInput {
  liquidityUsd: number | null;
  fdvUsd: number | null;
  buys: number | null;
  sells: number | null;
  volume24hUsd: number | null;
  createdAt: string | null;
  now?: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Four meters computed only from pool numbers we actually have. Anything missing becomes a no-value meter. */
export function healthMeters(i: HealthInput): HealthMeter[] {
  const liq = i.liquidityUsd !== null && i.liquidityUsd > 0 ? i.liquidityUsd : null;
  const fdv = i.fdvUsd !== null && i.fdvUsd > 0 ? i.fdvUsd : null;
  const depth = liq !== null && fdv !== null ? (liq / fdv) * 100 : null;
  const tr = i.buys !== null && i.sells !== null ? i.buys + i.sells : 0;
  const share = tr > 0 && i.buys !== null ? (i.buys / tr) * 100 : null;
  const turn = liq !== null && i.volume24hUsd !== null ? i.volume24hUsd / liq : null;
  const created = i.createdAt ? Date.parse(i.createdAt) : NaN;
  const days = Number.isFinite(created) ? Math.max(0, ((i.now ?? Date.now()) - created) / 86_400_000) : null;
  return [
    {
      id: "depth",
      label: "Depth",
      value: depth === null ? null : clamp(depth * 10),
      display: depth === null ? "—" : `${depth.toFixed(depth < 10 ? 1 : 0)}%`,
      tone: depth === null ? "brand" : depth < 2 ? "down" : depth < 5 ? "warm" : "up",
      tip: "Liquidity divided by fully diluted value. A thin pool against a large valuation means a small sale can move the price a lot. Full bar is 10% or more.",
    },
    {
      id: "buyShare",
      label: "Buy share 24h",
      value: share,
      display: share === null ? "—" : `${share.toFixed(0)}%`,
      tone: share === null ? "brand" : share < 45 ? "down" : share < 50 ? "warm" : "up",
      tip: "Buys as a share of all trades in the last 24 hours, by count. It says nothing about trade size, and one wallet can split into many trades.",
    },
    {
      id: "turnover",
      label: "Turnover",
      value: turn === null ? null : clamp((turn / 3) * 100),
      display: turn === null ? "—" : `${turn.toFixed(turn < 10 ? 2 : 1)}x`,
      tone: turn === null ? "brand" : turn < 0.05 || turn > 10 ? "warm" : "up",
      tip: "24h volume divided by liquidity. Near zero means few trades. Above 10 times usually means heavy churn that the pool depth may not sustain. Full bar is 3 times.",
    },
    {
      id: "age",
      label: "Pool age",
      value: days === null ? null : clamp((days / 30) * 100),
      display: days === null ? "—" : days < 1 ? `${Math.max(1, Math.floor(days * 24))}h` : `${Math.floor(days)}d`,
      tone: days === null ? "brand" : days < 1 ? "down" : days < 7 ? "warm" : "up",
      tip: "Time since the oldest known pool was created. New pools carry more risk simply because they have less history. Full bar is 30 days.",
    },
  ];
}
