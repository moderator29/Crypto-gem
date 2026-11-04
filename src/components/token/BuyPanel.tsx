"use client";

import { ArrowUpRight, Info, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { playSound } from "@/components/fx/sound";
import type { TradeLink } from "@/lib/trade-links";
import { priceUsd as fmtPrice } from "@/lib/utils/format";

interface Quote { outAmountRaw: string; minOutRaw: string; priceImpactPct: number; routes: string[]; at: string }
type QState = { s: "idle" } | { s: "loading" } | { s: "ok"; q: Quote } | { s: "error"; msg: string };

const SLIPPAGE = [50, 100, 300] as const;
const PRESETS = { SOL: [0.1, 0.5, 1, 5], USDC: [10, 50, 100, 500] } as const;

const fmtTokens = (n: number) => (n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toLocaleString("en-US", { maximumSignificantDigits: 6 }));

/**
 * Non-custodial buy panel. It shows what an amount would buy and then sends the person to a venue to sign with
 * their own wallet. Crypto Gems never holds keys, never signs, never touches funds. Solana tokens get a live
 * Jupiter quote. Other chains get an estimate from the pool price, labelled as an estimate.
 */
export function BuyPanel({ networkId, address, symbol, decimals, poolPriceUsd, solUsd, links }: { networkId: string; address: string; symbol: string; decimals: number | null; poolPriceUsd: number | null; solUsd: number | null; links: TradeLink[] }) {
  const solana = networkId === "solana";
  const [pay, setPay] = useState<"SOL" | "USDC">("SOL");
  const [amount, setAmount] = useState("1");
  const [slip, setSlip] = useState<(typeof SLIPPAGE)[number]>(50);
  const [st, setSt] = useState<QState>({ s: "idle" });
  const [tick, setTick] = useState(0);

  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0;
  const usdIn = valid ? (solana && pay === "SOL" ? (solUsd ? n * solUsd : null) : n) : null;

  const load = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!solana || !valid || decimals === null) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setSt({ s: "loading" });
      fetch(`/api/quote?mint=${encodeURIComponent(address)}&pay=${pay}&amount=${n}&slippageBps=${slip}`, { signal: ctrl.signal })
        .then(async (r) => ({ ok: r.ok, j: (await r.json()) as Quote & { error?: string } }))
        .then(({ ok, j }) => setSt(ok ? { s: "ok", q: j } : { s: "error", msg: j.error ?? "No quote available." }))
        .catch((e: Error) => e.name !== "AbortError" && setSt({ s: "error", msg: "The quote provider is not responding." }));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [solana, valid, decimals, address, pay, n, slip, tick]);

  useEffect(() => {
    if (st.s !== "ok") return;
    playSound("tap");
    const id = setInterval(load, 25_000);
    return () => clearInterval(id);
  }, [st.s, load]);

  const out = st.s === "ok" && decimals !== null ? Number(st.q.outAmountRaw) / 10 ** decimals : null;
  const minOut = st.s === "ok" && decimals !== null ? Number(st.q.minOutRaw) / 10 ** decimals : null;
  const estimate = !solana && usdIn && poolPriceUsd ? usdIn / poolPriceUsd : null;
  const primary = links[0];
  const impactHigh = st.s === "ok" && st.q.priceImpactPct >= 3;

  return (
    <section className="card fx-border space-y-4 p-4" aria-label="Buy">
      <div className="flex items-center justify-between">
        <h2 className="h3">Buy {symbol}</h2>
        <span className="badge badge-up"><ShieldCheck size={12} aria-hidden="true" /> Non-custodial</span>
      </div>

      {solana && (
        <div className="flex gap-2" role="group" aria-label="Pay with">
          {(["SOL", "USDC"] as const).map((p) => <button key={p} type="button" className="chip flex-1 justify-center" aria-pressed={pay === p} onClick={() => { setPay(p); setAmount(String(PRESETS[p][1])); }}>Pay with {p}</button>)}
        </div>
      )}

      <div>
        <label htmlFor="buy-amount" className="mb-1.5 block text-xs font-semibold text-muted">{solana ? `Amount in ${pay}` : "Amount in USD"}</label>
        <input id="buy-amount" className="input num !text-xl font-bold" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} aria-invalid={!valid} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(solana ? PRESETS[pay] : ([25, 100, 250, 1000] as const)).map((v) => <button key={v} type="button" className="chip !min-h-8 !px-3" onClick={() => setAmount(String(v))}>{solana ? v : `$${v}`}</button>)}
        </div>
      </div>

      <div className="card-flat space-y-2 p-3 text-sm" aria-live="polite">
        <div className="flex items-center justify-between"><span className="text-muted">You receive</span>
          <span className="num text-lg font-bold">
            {st.s === "loading" && <Loader2 size={16} className="inline animate-spin text-muted" aria-label="Loading quote" />}
            {st.s !== "loading" && (out !== null ? `${fmtTokens(out)} ${symbol}` : estimate !== null ? `~${fmtTokens(estimate)} ${symbol}` : "—")}
          </span>
        </div>
        {usdIn !== null && <div className="flex items-center justify-between text-xs text-muted"><span>Value in</span><span className="num">${usdIn.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span></div>}
        {st.s === "ok" && minOut !== null && (
          <>
            <div className="flex items-center justify-between text-xs text-muted"><span>Minimum after {slip / 100}% slippage</span><span className="num">{fmtTokens(minOut)} {symbol}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted">Price impact</span><span className={`num font-semibold ${impactHigh ? "text-down" : "text-soft"}`}>{st.q.priceImpactPct.toFixed(2)}%</span></div>
            <div className="flex items-center justify-between text-xs text-muted"><span>Route</span><span className="truncate pl-3">{st.q.routes.join(", ") || "Jupiter"}</span></div>
          </>
        )}
        {st.s === "error" && <p className="text-xs text-down" role="status">{st.msg}</p>}
        {!solana && <p className="flex items-start gap-1.5 text-xs text-muted"><Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> Estimate from the pool price at {fmtPrice(poolPriceUsd)}. Fees, price impact and slippage are applied by the venue you choose.</p>}
        {solana && st.s === "ok" && <p className="text-xs text-muted">Quote from Jupiter, refreshed every 25 seconds. {impactHigh ? "High price impact: consider a smaller amount." : ""}</p>}
      </div>

      {solana && (
        <div className="flex items-center gap-2" role="group" aria-label="Slippage">
          <span className="text-xs font-semibold text-muted">Slippage</span>
          {SLIPPAGE.map((s) => <button key={s} type="button" className="chip !min-h-8 !px-3" aria-pressed={slip === s} onClick={() => setSlip(s)}>{s / 100}%</button>)}
          <button type="button" className="btn btn-icon btn-sm ml-auto" aria-label="Refresh quote" onClick={load}><RefreshCw size={14} /></button>
        </div>
      )}

      {primary ? (
        <a href={primary.url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => playSound("whoosh")} className="btn btn-primary btn-lg w-full">Continue on {primary.label} <ArrowUpRight size={16} /></a>
      ) : (
        <p className="text-sm text-muted">No verified trading venue is available for this network yet.</p>
      )}
      {links.slice(1).map((t) => <a key={t.url} href={t.url} target="_blank" rel="noopener noreferrer nofollow" className="btn w-full">{t.label} <ArrowUpRight size={15} /></a>)}
      <p className="text-center text-[11px] text-muted">Crypto Gems never holds keys or funds. You approve and sign every swap in your own wallet on the venue you choose. Not financial advice.</p>
    </section>
  );
}
