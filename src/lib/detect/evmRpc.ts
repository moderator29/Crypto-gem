import { getNetwork } from "@/lib/market-data/networks";

const SELECTORS = { name: "0x06fdde03", symbol: "0x95d89b41", decimals: "0x313ce567", totalSupply: "0x18160ddd" } as const;

export function rpcUrl(networkId: string): string | null {
  const v = process.env[`RPC_${networkId.toUpperCase()}`];
  return v && v.startsWith("https://") ? v : null;
}

async function ethCall(url: string, to: string, data: string): Promise<string | null> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] });
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, signal: AbortSignal.timeout(6000) }).catch(() => null);
  if (!r?.ok) return null;
  const j = (await r.json().catch(() => null)) as { result?: string; error?: unknown } | null;
  return j && typeof j.result === "string" && j.result !== "0x" ? j.result : null;
}

function decodeString(hex: string): string | null {
  const raw = hex.slice(2);
  try {
    if (raw.length === 64) return Buffer.from(raw.replace(/(00)+$/, ""), "hex").toString("utf8") || null;
    const len = parseInt(raw.slice(64, 128), 16);
    if (!Number.isFinite(len) || len <= 0 || len > 256) return null;
    return Buffer.from(raw.slice(128, 128 + len * 2), "hex").toString("utf8");
  } catch {
    return null;
  }
}

export interface EvmTokenOnChain {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupplyRaw: string | null;
}

/** Reads ERC-20 metadata straight from a chain. Returns null when no RPC is configured. */
export async function readErc20(networkId: string, address: string): Promise<EvmTokenOnChain | null> {
  const net = getNetwork(networkId);
  const url = rpcUrl(networkId);
  if (!net || net.family !== "evm" || !url) return null;
  const [name, symbol, decimals, supply] = await Promise.all([
    ethCall(url, address, SELECTORS.name),
    ethCall(url, address, SELECTORS.symbol),
    ethCall(url, address, SELECTORS.decimals),
    ethCall(url, address, SELECTORS.totalSupply),
  ]);
  if (!name && !symbol && !decimals && !supply) return null;
  return {
    name: name ? decodeString(name) : null,
    symbol: symbol ? decodeString(symbol) : null,
    decimals: decimals ? Number(BigInt(decimals)) : null,
    totalSupplyRaw: supply ? BigInt(supply).toString() : null,
  };
}
