export type ProviderId = "geckoterminal" | "coingecko" | "coinmarketcap" | "rpc" | "dexscreener" | "dextools" | "birdeye";

export type Freshness = "live" | "recent" | "stale";

/** A value together with where it came from and when. */
export interface Observed<T> {
  value: T | null;
  source: ProviderId;
  observedAt: string;
}

export interface Network {
  /** Our canonical id, e.g. "ethereum". */
  id: string;
  name: string;
  family: "evm" | "solana" | "bitcoin" | "ton" | "other";
  chainId?: number;
  nativeSymbol: string;
  explorer?: string;
  /** GeckoTerminal network slug, when supported. */
  geckoterminal?: string;
  /** CoinGecko asset platform id, when supported. */
  coingecko?: string;
  /** Detection and checkout can use this network. */
  contractLookup: boolean;
}

export interface TokenRef {
  networkId: string;
  address: string;
}

export interface PoolSummary {
  id: string;
  networkId: string;
  address: string;
  name: string;
  dex: string | null;
  createdAt: string | null;
  baseToken: TokenIdentity;
  quoteToken: TokenIdentity | null;
  priceUsd: number | null;
  liquidityUsd: number | null;
  fdvUsd: number | null;
  marketCapUsd: number | null;
  volumeUsd: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  change: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  txns24h: { buys: number; sells: number } | null;
  txns1h: { buys: number; sells: number } | null;
  source: ProviderId;
  observedAt: string;
}

export interface TokenIdentity {
  networkId: string;
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  decimals: number | null;
  coingeckoId: string | null;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type RiskLevel = "info" | "low" | "medium" | "high";

export interface RiskSignal {
  code: string;
  level: RiskLevel;
  message: string;
  source: ProviderId | "derived";
  observedAt: string;
}
