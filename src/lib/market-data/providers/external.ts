/** Shape every secondary provider (DexScreener, DexTools, Birdeye) is normalised to before the detector merges them. */
export interface ExternalTokenInfo {
  provider: "dexscreener" | "dextools" | "birdeye";
  name: string | null;
  symbol: string | null;
  logoUrl: string | null;
  headerUrl: string | null;
  description: string | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  launchDate: string | null;
}

export const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
