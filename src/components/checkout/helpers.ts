/** Pure display helpers for the checkout screens. */

export type HashFamily = "evm" | "solana";

export const hashFamily = (networkId: string): HashFamily => (networkId === "solana" ? "solana" : "evm");

/** Checks a pasted transaction hash for the chain family. Empty input is neither valid nor an error. */
export function validateTxHash(family: HashFamily, value: string): { ok: boolean; error: string | null } {
  const v = value.trim();
  if (!v) return { ok: false, error: null };
  if (family === "evm") {
    if (/^0x[0-9a-fA-F]{64}$/.test(v)) return { ok: true, error: null };
    if (!v.startsWith("0x")) return { ok: false, error: "An EVM transaction hash starts with 0x." };
    return { ok: false, error: "That should be 0x followed by 64 characters (0 to 9, a to f)." };
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(v)) return { ok: true, error: null };
  return { ok: false, error: "A Solana signature is 80 to 90 letters and numbers." };
}

export interface AddressChunk {
  text: string;
  highlight: boolean;
}

/** First and last 6 characters highlighted, the middle in groups of `size`, for checking against a wallet screen. */
export function addressChunks(address: string, size = 4): AddressChunk[] {
  if (address.length <= 12) return [{ text: address, highlight: true }];
  const out: AddressChunk[] = [{ text: address.slice(0, 6), highlight: true }];
  const middle = address.slice(6, -6);
  for (let i = 0; i < middle.length; i += size) out.push({ text: middle.slice(i, i + size), highlight: false });
  out.push({ text: address.slice(-6), highlight: true });
  return out;
}

/** Thousands separators on the whole part only. The decimals are never rounded. */
export function formatAmount(amount: string): string {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!m) return amount;
  const whole = (m[1] as string).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return m[2] ? `${whole}.${m[2]}` : whole;
}

/** Splits an amount so the fingerprint (last 4 digits) can be lit up. */
export function splitFingerprint(amount: string): { head: string; tail: string } {
  const f = formatAmount(amount);
  if (!f.includes(".")) return { head: f, tail: "" };
  const cut = Math.max(f.indexOf(".") + 1, f.length - 4);
  return { head: f.slice(0, cut), tail: f.slice(cut) };
}

export const formatUsd = (n: number): string => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function remainingSeconds(expiresAt: string, nowMs: number): number {
  const t = Date.parse(expiresAt);
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((t - nowMs) / 1000));
}

export const shortHash = (hash: string, edge = 8): string => (hash.length <= edge * 2 + 3 ? hash : `${hash.slice(0, edge)}...${hash.slice(-edge)}`);

export const receiptHref = (token: string): string => `/checkout/receipt?r=${encodeURIComponent(token)}`;

export function kindLabel(kind: string): string {
  if (kind === "boost") return "Boost pack";
  if (kind === "listing") return "Token listing";
  if (kind === "banner") return "Banner campaign";
  return "Order";
}

export function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Not recorded" : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

/** Plain text receipt for pasting into a chat with an admin. */
export function receiptText(
  r: { number: string; title: string; lines: string[]; priceUsd: number; received: string; asset: string; networkLabel: string; txHash: string; explorerTxUrl: string; paidAt: string },
  link: string | null,
): string {
  return [
    `CryptoGemCN receipt ${r.number}`,
    r.title,
    ...r.lines,
    `Price: ${formatUsd(r.priceUsd)}`,
    `Paid: ${r.received} ${r.asset} on ${r.networkLabel}`,
    `Transaction: ${r.txHash}`,
    `Explorer: ${r.explorerTxUrl}`,
    `Paid at: ${r.paidAt}`,
    ...(link ? [`Receipt: ${link}`] : []),
  ].join("\n");
}
