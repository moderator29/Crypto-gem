import { classifyAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";

export interface TradeLink {
  label: string;
  url: string;
}

const UNISWAP_CHAIN: Record<string, string> = { ethereum: "ethereum", base: "base", arbitrum: "arbitrum", optimism: "optimism", polygon: "polygon", avalanche: "avalanche", bsc: "bnb", blast: "blast" };

/**
 * Builds external swap destinations only from a validated network and
 * address. The host is fixed per venue, so a crafted address can never steer
 * a user to an arbitrary site.
 */
export function tradeLinks(networkId: string, address: string, poolAddress?: string | null): TradeLink[] {
  const kind = classifyAddress(address);
  const net = getNetwork(networkId);
  if (!net || kind === "unknown" || kind === "bitcoin") return [];
  const a = encodeURIComponent(address);
  const out: TradeLink[] = [];
  if (net.id === "solana" && kind === "solana") {
    out.push({ label: "Jupiter", url: `https://jup.ag/swap/SOL-${a}` });
  }
  if (kind === "evm") {
    if (UNISWAP_CHAIN[net.id]) out.push({ label: "Uniswap", url: `https://app.uniswap.org/swap?chain=${UNISWAP_CHAIN[net.id]}&outputCurrency=${a}` });
    if (net.id === "bsc") out.push({ label: "PancakeSwap", url: `https://pancakeswap.finance/swap?chain=bsc&outputCurrency=${a}` });
  }
  if (net.geckoterminal && poolAddress && /^[A-Za-z0-9_.:-]{10,100}$/.test(poolAddress)) {
    out.push({ label: "View pool on GeckoTerminal", url: `https://www.geckoterminal.com/${net.geckoterminal}/pools/${encodeURIComponent(poolAddress)}` });
  }
  return out;
}
