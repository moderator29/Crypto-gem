import { getNetwork } from "@/lib/market-data/networks";

/** Brand-adjacent accent per chain. These are plain colour chips with initials, not official logos. */
const TINT: Record<string, string> = {
  ethereum: "#627eea", solana: "#14f195", bsc: "#f3ba2f", base: "#0052ff", arbitrum: "#28a0f0", optimism: "#ff0420",
  polygon: "#8247e5", avalanche: "#e84142", ton: "#0098ea", tron: "#ff3b30", sui: "#4da2ff", robinhood: "#9cf200",
  fantom: "#1969ff", sonic: "#ff9e2c", linea: "#61dfff", zksync: "#8c8dfc", scroll: "#ffbd6e", mantle: "#65b3ae",
  blast: "#fcfc03", cronos: "#2f4eaa", celo: "#fbcc5c", gnosis: "#04795b", aptos: "#5ee6c8", near: "#7a7a7a",
};

const INITIALS: Record<string, string> = { ethereum: "Ξ", solana: "S", bsc: "B", base: "Ba", arbitrum: "A", optimism: "OP", polygon: "P", avalanche: "AV", ton: "T", tron: "TR", sui: "SU", robinhood: "RH" };

export function ChainBadge({ networkId, size = 20, className = "" }: { networkId: string; size?: number; className?: string }) {
  const name = getNetwork(networkId)?.name ?? networkId;
  const tint = TINT[networkId] ?? "#6b7cff";
  const text = INITIALS[networkId] ?? name.slice(0, 2).toUpperCase();
  return (
    <span
      title={name}
      aria-label={name}
      role="img"
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, ${tint}, color-mix(in srgb, ${tint} 55%, #000))`, boxShadow: `0 0 0 1px color-mix(in srgb, ${tint} 50%, transparent)` }}
    >
      {text}
    </span>
  );
}
