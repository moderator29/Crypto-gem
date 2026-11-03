import type { Network } from "./types";

/**
 * Central network registry. Metadata here is curated; the set of networks the
 * data providers actually index is discovered at runtime (see
 * `discoverNetworks`) so a missing entry never hides a supported chain.
 */
const evm = (
  id: string,
  name: string,
  chainId: number,
  nativeSymbol: string,
  explorer: string,
  geckoterminal?: string,
  coingecko?: string,
): Network => ({ id, name, family: "evm", chainId, nativeSymbol, explorer, geckoterminal, coingecko, contractLookup: true });

export const NETWORKS: Network[] = [
  evm("ethereum", "Ethereum", 1, "ETH", "https://etherscan.io", "eth", "ethereum"),
  { id: "solana", name: "Solana", family: "solana", nativeSymbol: "SOL", explorer: "https://solscan.io", geckoterminal: "solana", coingecko: "solana", contractLookup: true },
  evm("bsc", "BNB Chain", 56, "BNB", "https://bscscan.com", "bsc", "binance-smart-chain"),
  evm("base", "Base", 8453, "ETH", "https://basescan.org", "base", "base"),
  evm("arbitrum", "Arbitrum One", 42161, "ETH", "https://arbiscan.io", "arbitrum", "arbitrum-one"),
  evm("optimism", "Optimism", 10, "ETH", "https://optimistic.etherscan.io", "optimism", "optimistic-ethereum"),
  evm("polygon", "Polygon", 137, "POL", "https://polygonscan.com", "polygon_pos", "polygon-pos"),
  evm("avalanche", "Avalanche", 43114, "AVAX", "https://snowtrace.io", "avax", "avalanche"),
  evm("fantom", "Fantom", 250, "FTM", "https://ftmscan.com", "ftm", "fantom"),
  evm("sonic", "Sonic", 146, "S", "https://sonicscan.org", "sonic", "sonic"),
  evm("linea", "Linea", 59144, "ETH", "https://lineascan.build", "linea", "linea"),
  evm("zksync", "zkSync Era", 324, "ETH", "https://explorer.zksync.io", "zksync", "zksync"),
  evm("scroll", "Scroll", 534352, "ETH", "https://scrollscan.com", "scroll", "scroll"),
  evm("mantle", "Mantle", 5000, "MNT", "https://mantlescan.xyz", "mantle", "mantle"),
  evm("blast", "Blast", 81457, "ETH", "https://blastscan.io", "blast", "blast"),
  evm("celo", "Celo", 42220, "CELO", "https://celoscan.io", "celo", "celo"),
  evm("cronos", "Cronos", 25, "CRO", "https://cronoscan.com", "cro", "cronos"),
  evm("gnosis", "Gnosis", 100, "xDAI", "https://gnosisscan.io", "xdai", "xdai"),
  evm("moonbeam", "Moonbeam", 1284, "GLMR", "https://moonscan.io", "glmr", "moonbeam"),
  evm("moonriver", "Moonriver", 1285, "MOVR", "https://moonriver.moonscan.io", "movr", "moonriver"),
  evm("aurora", "Aurora", 1313161554, "ETH", "https://explorer.aurora.dev", "aurora", "aurora"),
  evm("opbnb", "opBNB", 204, "BNB", "https://opbnb.bscscan.com", "opbnb", "opbnb"),
  evm("robinhood", "Robinhood Chain", 4663, "ETH", "https://robinhoodchain.blockscout.com", "robinhood"),
  { id: "ton", name: "TON", family: "ton", nativeSymbol: "TON", explorer: "https://tonviewer.com", geckoterminal: "ton", coingecko: "the-open-network", contractLookup: true },
  { id: "tron", name: "TRON", family: "other", nativeSymbol: "TRX", explorer: "https://tronscan.org", geckoterminal: "tron", coingecko: "tron", contractLookup: true },
  { id: "sui", name: "Sui", family: "other", nativeSymbol: "SUI", explorer: "https://suivision.xyz", geckoterminal: "sui-network", coingecko: "sui", contractLookup: true },
  { id: "aptos", name: "Aptos", family: "other", nativeSymbol: "APT", explorer: "https://explorer.aptoslabs.com", geckoterminal: "aptos", coingecko: "aptos", contractLookup: true },
  { id: "near", name: "NEAR", family: "other", nativeSymbol: "NEAR", explorer: "https://nearblocks.io", geckoterminal: "near", coingecko: "near-protocol", contractLookup: true },
  { id: "bitcoin", name: "Bitcoin", family: "bitcoin", nativeSymbol: "BTC", explorer: "https://mempool.space", coingecko: "bitcoin", contractLookup: false },
  { id: "cardano", name: "Cardano", family: "other", nativeSymbol: "ADA", coingecko: "cardano", contractLookup: false },
  { id: "polkadot", name: "Polkadot", family: "other", nativeSymbol: "DOT", coingecko: "polkadot", contractLookup: false },
];

const byId = new Map(NETWORKS.map((n) => [n.id, n]));
const byGecko = new Map(NETWORKS.filter((n) => n.geckoterminal).map((n) => [n.geckoterminal as string, n]));

export function getNetwork(id: string): Network | undefined {
  return byId.get(id);
}

export function networkFromGecko(slug: string): Network | undefined {
  return byGecko.get(slug);
}

export function explorerTokenUrl(networkId: string, address: string): string | null {
  const n = byId.get(networkId);
  if (!n?.explorer) return null;
  if (n.id === "solana") return `${n.explorer}/token/${address}`;
  if (n.id === "ton") return `${n.explorer}/${address}`;
  if (n.family === "evm") return `${n.explorer}/token/${address}`;
  return n.explorer;
}
