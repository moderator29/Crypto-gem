import { ImageResponse } from "next/og";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { priceUsd, usdCompact } from "@/lib/utils/format";

export const alt = "Token share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;

/** Share card for a token: name, network, live price, 24h change and liquidity. Falls back to a plain card if data is unavailable. */
export default async function Image({ params }: { params: Promise<{ network: string; address: string }> }) {
  const { network, address: raw } = await params;
  const net = getNetwork(network);
  const address = decodeURIComponent(raw);
  let name = "Token";
  let symbol = "";
  let price: number | null = null;
  let change: number | null = null;
  let liq: number | null = null;
  if (net?.geckoterminal && classifyAddress(address) !== "unknown") {
    const canonical = normalizeAddress(address);
    const [t, p] = await Promise.allSettled([geckoTerminal.token(net.geckoterminal, canonical), geckoTerminal.poolsForToken(net.geckoterminal, canonical)]);
    if (t.status === "fulfilled") {
      name = t.value.identity?.name || name;
      symbol = t.value.identity?.symbol || "";
      price = t.value.priceUsd;
      liq = t.value.liquidityUsd;
    }
    if (p.status === "fulfilled") {
      const top = [...p.value.pools].sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))[0];
      change = top?.change.h24 ?? null;
      price = price ?? top?.priceUsd ?? null;
    }
  }
  const up = (change ?? 0) >= 0;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "radial-gradient(70% 90% at 10% 0%, rgba(232,67,42,0.5), #08080a 62%)", color: "#f6f6f8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="56" height="56" viewBox="0 0 32 32"><path d="M9 4h14l6 8-13 16L3 12l6-8Z" fill="#ff5a3c" /></svg>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}><span>Crypto</span><span style={{ color: "#ff9a5c" }}>Gems</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 28, color: "#8d8d98" }}>{net?.name ?? network}</div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 8 }}>{name.slice(0, 28)}{symbol ? ` (${symbol.slice(0, 10)})` : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontSize: 24, color: "#8d8d98" }}>Price</div><div style={{ display: "flex", fontSize: 60, fontWeight: 700 }}>{priceUsd(price)}</div></div>
          <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontSize: 24, color: "#8d8d98" }}>24h</div><div style={{ display: "flex", fontSize: 60, fontWeight: 700, color: change === null ? "#8d8d98" : up ? "#2fe0a1" : "#ff4d6d" }}>{change === null ? "n/a" : `${up ? "+" : ""}${change.toFixed(1)}%`}</div></div>
          <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontSize: 24, color: "#8d8d98" }}>Liquidity</div><div style={{ display: "flex", fontSize: 60, fontWeight: 700 }}>{usdCompact(liq)}</div></div>
        </div>
      </div>
    ),
    size,
  );
}
