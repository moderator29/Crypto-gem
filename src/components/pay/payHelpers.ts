export type AddressFamily = "evm" | "solana";

const EVM_HASH = /^0x[0-9a-fA-F]{64}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function networkFamily(networkId: string): AddressFamily {
  return networkId === "solana" ? "solana" : "evm";
}

export function isEvmTxHash(value: string): boolean {
  return EVM_HASH.test(value.trim());
}

export function isSolanaSignature(value: string): boolean {
  const v = value.trim();
  return v.length >= 80 && v.length <= 90 && BASE58.test(v);
}

/** Checks a pasted transaction hash for the chain family. Empty input is neither valid nor an error. */
export function validateTxHash(family: AddressFamily, value: string): { ok: boolean; error: string | null } {
  const v = value.trim();
  if (!v) return { ok: false, error: null };
  if (family === "evm") {
    if (isEvmTxHash(v)) return { ok: true, error: null };
    if (!v.startsWith("0x")) return { ok: false, error: "An EVM transaction hash starts with 0x." };
    return { ok: false, error: "That should be 0x followed by 64 characters (0 to 9, a to f)." };
  }
  if (isSolanaSignature(v)) return { ok: true, error: null };
  return { ok: false, error: "A Solana signature is 80 to 90 letters and numbers." };
}

export interface AddressChunk {
  text: string;
  highlight: boolean;
}

/** Splits an address for easy visual checking: first 6 and last 6 characters highlighted, the middle in groups of `size`. */
export function addressChunks(address: string, size = 4): AddressChunk[] {
  if (address.length <= 12) return [{ text: address, highlight: true }];
  const head = address.slice(0, 6);
  const tail = address.slice(-6);
  const middle = address.slice(6, -6);
  const out: AddressChunk[] = [{ text: head, highlight: true }];
  for (let i = 0; i < middle.length; i += size) out.push({ text: middle.slice(i, i + size), highlight: false });
  out.push({ text: tail, highlight: true });
  return out;
}

/** Adds thousands separators to the whole part of a decimal string without rounding or touching the decimals. */
export function formatAmount(amount: string): string {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!m) return amount;
  const whole = (m[1] as string).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return m[2] ? `${whole}.${m[2]}` : whole;
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function remainingSeconds(expiresAt: string, nowMs: number): number {
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - nowMs) / 1000));
}

function toScaled(value: string, scale: number): bigint | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!m) return null;
  const frac = (m[2] ?? "").padEnd(scale, "0");
  return BigInt((m[1] as string) + frac);
}

/** Exact decimal difference (expected minus paid) as a decimal string, or null when nothing is owed or the input is not numeric. */
export function amountShortfall(expected: string, paid: string | number | null): string | null {
  if (paid === null || paid === undefined) return null;
  const p = String(paid);
  const scale = Math.max((expected.split(".")[1] ?? "").length, (p.split(".")[1] ?? "").length);
  const e = toScaled(expected, scale);
  const q = toScaled(p, scale);
  if (e === null || q === null || q <= BigInt(0) || q >= e) return null;
  const diff = (e - q).toString().padStart(scale + 1, "0");
  if (scale === 0) return diff;
  const whole = diff.slice(0, -scale);
  const frac = diff.slice(-scale).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}

export function kindLabel(kind: string): string {
  if (kind === "boost") return "Boost pack";
  if (kind === "listing") return "Token listing";
  if (kind === "ad_campaign") return "Banner campaign";
  return "Order";
}

export function isNativeMethod(m: { kind: string; token: string | null }): boolean {
  return m.kind === "native" || !m.token;
}

export function networkWarning(asset: string, networkLabel: string): string {
  return `Send only ${asset} on ${networkLabel}. Other networks are lost.`;
}

export function shortHash(hash: string, edge = 8): string {
  return hash.length <= edge * 2 + 1 ? hash : `${hash.slice(0, edge)}...${hash.slice(-edge)}`;
}
