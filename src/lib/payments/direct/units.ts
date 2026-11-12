/** Pure helpers for direct payments. No I/O, so every rule here is unit tested. */

export const TOLERANCE_BPS = 50;
export const NATIVE_BUFFER_BPS = 150;
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const DECIMAL = /^\d+(\.\d+)?$/;

/** Exact decimal string to base units. Throws on malformed input or more fraction digits than the asset has. */
export function decimalToUnits(value: string, decimals: number): bigint {
  const v = value.trim();
  if (!DECIMAL.test(v)) throw new Error("Invalid decimal amount");
  const [whole, frac = ""] = v.split(".");
  if (frac.length > decimals) throw new Error("Too many decimal places");
  return BigInt(whole + frac.padEnd(decimals, "0"));
}

/** Base units to an exact decimal string with trailing zeros trimmed. */
export function unitsToDecimal(units: bigint, decimals: number): string {
  const neg = units < 0n;
  const s = (neg ? -units : units).toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

/** True when received covers expected minus the tolerance (default 0.5%). */
export function withinTolerance(received: bigint, expected: bigint, bps = TOLERANCE_BPS): boolean {
  return received * 10000n >= expected * BigInt(10000 - bps);
}

/** Formats a stored numeric (number or string) as a plain decimal string with at most `places` fraction digits. */
export function numberToDecimal(value: number | string, places = 6): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
  const s = n.toFixed(places);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/** Stablecoin amount: the order price in USD, rounded up to the asset precision. Never short. */
export function stableAmount(usd: number, places = 6): string {
  if (!Number.isFinite(usd) || usd <= 0) throw new Error("Invalid price");
  const scaled = Math.ceil(Number((usd * 10 ** places).toPrecision(12)));
  return unitsToDecimal(BigInt(scaled), places);
}

/** Native coin amount: usd / rate plus a volatility buffer, rounded UP to `places` decimals. */
export function nativeAmount(usd: number, rate: number, places = 6, bufferBps = NATIVE_BUFFER_BPS): string {
  if (!Number.isFinite(usd) || usd <= 0 || !Number.isFinite(rate) || rate <= 0) throw new Error("Invalid quote input");
  const value = (usd / rate) * (1 + bufferBps / 10000);
  const scaled = Math.ceil(Number((value * 10 ** places).toPrecision(12)));
  return unitsToDecimal(BigInt(scaled), places);
}

/** Receipt number: CG-YYYYMMDD-<first 6 of payment id uppercase>. Date is UTC. */
export function receiptNumber(paymentId: string, at: Date): string {
  const d = at.toISOString().slice(0, 10).replace(/-/g, "");
  return `CG-${d}-${paymentId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export const isEvmHash = (s: string): boolean => /^0x[0-9a-fA-F]{64}$/.test(s);
export const isSolanaSignature = (s: string): boolean => /^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(s);
export const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** EVM hex addresses are case-insensitive. Never use this for Solana. */
export const evmAddressEq = (a: string | null | undefined, b: string): boolean => typeof a === "string" && a.toLowerCase() === b.toLowerCase();

export interface EvmLog {
  address: string;
  topics: string[];
  data: string;
}

/** Sum of ERC-20 Transfer amounts of `token` that were sent to `to` within one receipt's logs. */
export function parseErc20Transfers(logs: EvmLog[], token: string, to: string): bigint {
  const padded = `0x${"0".repeat(24)}${to.toLowerCase().replace(/^0x/, "")}`;
  let total = 0n;
  for (const log of logs) {
    if (!evmAddressEq(log.address, token)) continue;
    if (log.topics.length !== 3) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    if (log.topics[2]?.toLowerCase() !== padded) continue;
    if (!/^0x[0-9a-fA-F]+$/.test(log.data)) continue;
    total += BigInt(log.data);
  }
  return total;
}

interface TokenBalance {
  mint?: string;
  owner?: string;
  uiTokenAmount?: { amount?: string };
}
export interface SolanaMeta {
  err?: unknown;
  preTokenBalances?: TokenBalance[] | null;
  postTokenBalances?: TokenBalance[] | null;
}

/** Net change of `mint` held by `owner` (post minus pre, base units). Owner and mint compare case-sensitively. */
export function parseSolanaTokenDelta(meta: SolanaMeta, owner: string, mint: string): bigint {
  const sum = (list: TokenBalance[] | null | undefined): bigint => {
    let t = 0n;
    for (const b of list ?? []) {
      if (b.owner !== owner || b.mint !== mint) continue;
      const a = b.uiTokenAmount?.amount;
      if (typeof a === "string" && /^\d+$/.test(a)) t += BigInt(a);
    }
    return t;
  };
  return sum(meta.postTokenBalances) - sum(meta.preTokenBalances);
}

export const EVM_CONFIRMATIONS: Record<string, number> = { ethereum: 3, bsc: 8, base: 5, arbitrum: 5, solana: 1 };

export type WindowClass = "in" | "short" | "over";

/**
 * Where a single transfer falls relative to the amount it should cover.
 * Stable: no more than 0.002 below, and above by at most min(0.5 USD, 0.5%). Native: 0.1% below, 1% above.
 */
export function classifyTransfer(received: bigint, target: bigint, kind: "stable" | "native", decimals: number): WindowClass {
  let lowerTol: bigint;
  let upperTol: bigint;
  if (kind === "stable") {
    lowerTol = decimalToUnits("0.002", decimals);
    const half = decimalToUnits("0.5", decimals);
    const pct = (target * 50n) / 10000n;
    upperTol = half < pct ? half : pct;
  } else {
    lowerTol = target / 1000n;
    upperTol = target / 100n;
  }
  if (received < target - lowerTol) return "short";
  if (received > target + upperTol) return "over";
  return "in";
}

/** Stablecoin amount: order price (4 decimals, rounded up) plus a fingerprint of k units of 0.0001. */
export function stableWithFingerprint(usd: number, k: number): string {
  return unitsToDecimal(decimalToUnits(stableAmount(usd, 4), 4) + BigInt(k), 4);
}

/** Native amount: buffered quote rounded up to 6 decimals plus a fingerprint of k millionths in the last 4 digits. */
export function nativeWithFingerprint(usd: number, rate: number, k: number): string {
  return unitsToDecimal(decimalToUnits(nativeAmount(usd, rate, 6), 6) + BigInt(k), 6);
}
