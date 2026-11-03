import type { PoolSummary, ProviderId } from "@/lib/market-data/types";

export type FieldSource = ProviderId | "user";

export interface Sourced<T> {
  value: T;
  source: FieldSource;
}

export interface NetworkMatch {
  networkId: string;
  networkName: string;
  token: { name: string; symbol: string; imageUrl: string | null };
  topPool: { address: string; dex: string | null; liquidityUsd: number | null; volume24hUsd: number | null } | null;
}

export interface DetectedToken {
  networkId: string;
  networkName: string;
  address: string;
  name: Sourced<string> | null;
  symbol: Sourced<string> | null;
  decimals: Sourced<number> | null;
  logoUrl: Sourced<string> | null;
  totalSupply: Sourced<string> | null;
  circulatingSupply: Sourced<number> | null;
  launchDate: Sourced<string> | null;
  priceUsd: Sourced<number> | null;
  marketCapUsd: Sourced<number> | null;
  fdvUsd: Sourced<number> | null;
  volume24hUsd: Sourced<number> | null;
  liquidityUsd: Sourced<number> | null;
  description: Sourced<string> | null;
  website: Sourced<string> | null;
  twitter: Sourced<string> | null;
  telegram: Sourced<string> | null;
  discord: Sourced<string> | null;
  coingeckoUrl: Sourced<string> | null;
  coinmarketcapUrl: Sourced<string> | null;
  pools: PoolSummary[];
  /** Fields no provider could supply. The owner completes these by hand. */
  missing: string[];
  /** Providers that failed or are not configured, so gaps are explained honestly. */
  providerNotes: Array<{ provider: string; status: "ok" | "not_configured" | "failed" | "no_match"; detail?: string }>;
  observedAt: string;
}

export type DetectStatus = "found" | "partial" | "multiple" | "not_found" | "invalid" | "unsupported" | "unavailable";

export type DetectEvent =
  | { type: "stage"; id: string; label: string; state: "running" | "done" | "skipped" | "failed" }
  | { type: "result"; status: DetectStatus; message?: string; matches?: NetworkMatch[]; token?: DetectedToken };
