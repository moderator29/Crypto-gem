/** Solana RPC endpoint: RPC_SOLANA wins, otherwise a Helius key builds the standard URL. Both support the DAS getAsset method. */
export function solanaRpcUrl(): string | null {
  const direct = process.env.RPC_SOLANA;
  if (direct && direct.startsWith("https://")) return direct;
  const helius = process.env.HELIUS_API_KEY;
  return helius ? `https://mainnet.helius-rpc.com/?api-key=${helius}` : null;
}

export interface SolanaAsset {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  imageUrl: string | null;
  description: string | null;
}

interface DasAsset {
  content?: { metadata?: { name?: string; symbol?: string; description?: string }; links?: { image?: string } };
  token_info?: { decimals?: number; supply?: number; symbol?: string };
}

/** Token metadata for a Solana mint through the DAS getAsset method. Returns null when no endpoint is configured or the mint is unknown. */
export async function readSolanaAsset(mint: string): Promise<SolanaAsset | null> {
  const url = solanaRpcUrl();
  if (!url) return null;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: "asset", method: "getAsset", params: { id: mint } }), signal: AbortSignal.timeout(7000) }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => null)) as { result?: DasAsset } | null;
  const a = j?.result;
  if (!a) return null;
  const decimals = a.token_info?.decimals ?? null;
  const supply = a.token_info?.supply;
  return {
    name: a.content?.metadata?.name?.trim() || null,
    symbol: (a.content?.metadata?.symbol || a.token_info?.symbol || "").trim() || null,
    decimals,
    totalSupply: supply !== undefined && decimals !== null ? (supply / 10 ** decimals).toString() : null,
    imageUrl: a.content?.links?.image ?? null,
    description: a.content?.metadata?.description?.trim() || null,
  };
}
