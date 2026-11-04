import { classifyAddress } from "@/lib/market-data/identifiers";
import { clientKey, rateLimit } from "@/lib/utils/rateLimit";

export const dynamic = "force-dynamic";

const WSOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAY = { SOL: { mint: WSOL, decimals: 9 }, USDC: { mint: USDC, decimals: 6 } } as const;

interface JupQuote {
  outAmount: string;
  priceImpactPct: string;
  slippageBps: number;
  otherAmountThreshold: string;
  routePlan: Array<{ swapInfo: { label: string }; percent: number }>;
}

/**
 * Read-only swap quote for a Solana token from Jupiter. Nothing is signed or sent: the person finishes the swap
 * in their own wallet. The pay amount is capped so this endpoint cannot be used for anything but a price check.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const mint = u.searchParams.get("mint") ?? "";
  const pay = (u.searchParams.get("pay") ?? "SOL") as keyof typeof PAY;
  const amount = Number(u.searchParams.get("amount"));
  const slippage = Math.min(500, Math.max(10, Math.round(Number(u.searchParams.get("slippageBps") ?? 50))));
  if (classifyAddress(mint) !== "solana" || !(pay in PAY) || !Number.isFinite(amount) || amount <= 0 || amount > 100_000) return Response.json({ error: "Invalid quote request" }, { status: 400 });
  if (!rateLimit(`quote:${clientKey(req)}`, 40, 60_000).ok) return Response.json({ error: "Too many quotes. Slow down." }, { status: 429 });
  const p = PAY[pay];
  const raw = Math.floor(amount * 10 ** p.decimals);
  if (raw < 1) return Response.json({ error: "Amount is too small" }, { status: 400 });
  try {
    const res = await fetch(`https://lite-api.jup.ag/swap/v1/quote?inputMint=${p.mint}&outputMint=${mint}&amount=${raw}&slippageBps=${slippage}`, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
    if (!res.ok) return Response.json({ error: res.status === 400 ? "No route found for this token and amount." : "The quote provider is not responding." }, { status: res.status === 400 ? 404 : 502 });
    const q = (await res.json()) as JupQuote;
    return Response.json({ outAmountRaw: q.outAmount, minOutRaw: q.otherAmountThreshold, priceImpactPct: Number(q.priceImpactPct) * 100, slippageBps: q.slippageBps, routes: [...new Set(q.routePlan.map((r) => r.swapInfo.label))].slice(0, 4), source: "jupiter", at: new Date().toISOString() });
  } catch {
    return Response.json({ error: "The quote provider is not responding." }, { status: 502 });
  }
}
