"use client";

import { AlertTriangle, Flame, RefreshCw, Sparkles, TrendingDown, TrendingUp, BarChart3, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeData } from "@/lib/market-data/home";
import { NETWORKS } from "@/lib/market-data/networks";
import { ageShort } from "@/lib/utils/format";
import { AvailableSlot } from "./AdSlots";
import { TokenRow } from "./TokenRow";

const TABS = [
  { id: "organic", label: "Trending", icon: Zap },
  { id: "heating", label: "Heating Up", icon: Flame },
  { id: "fresh", label: "New Pairs", icon: Sparkles },
  { id: "gainers", label: "Gainers", icon: TrendingUp },
  { id: "losers", label: "Losers", icon: TrendingDown },
  { id: "volume", label: "Volume", icon: BarChart3 },
] as const;
type TabId = (typeof TABS)[number]["id"];

const CHAINS = NETWORKS.filter((n) => n.geckoterminal && ["ethereum", "solana", "bsc", "base", "arbitrum", "polygon", "avalanche", "optimism", "ton", "tron", "sui", "robinhood"].includes(n.id));
const POLL_MS = 45_000;

export function MarketBoard({ initial }: { initial: HomeData | null }) {
  const [data, setData] = useState<HomeData | null>(initial);
  const [tab, setTab] = useState<TabId>("organic");
  const [network, setNetwork] = useState<string | null>(null);
  const [state, setState] = useState<"ok" | "loading" | "error">(initial ? "ok" : "error");
  const [err, setErr] = useState<string | null>(initial ? null : "Market data is temporarily unavailable.");
  const reqId = useRef(0);

  const load = useCallback(async (net: string | null, silent: boolean) => {
    const id = ++reqId.current;
    if (!silent) setState("loading");
    try {
      const res = await fetch(`/api/market/home${net ? `?network=${net}` : ""}`);
      const json = await res.json();
      if (id !== reqId.current) return;
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setData(json as HomeData);
      setState("ok");
      setErr(null);
    } catch (e) {
      if (id !== reqId.current) return;
      setErr(e instanceof Error ? e.message : "Market data is temporarily unavailable.");
      setState((s) => (silent && s === "ok" ? "ok" : "error"));
    }
  }, []);

  useEffect(() => {
    const onTab = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (TABS.some((t) => t.id === id)) setTab(id as TabId);
    };
    window.addEventListener("cg:tab", onTab);
    return () => window.removeEventListener("cg:tab", onTab);
  }, []);

  useEffect(() => {
    const t = setInterval(() => !document.hidden && load(network, true), POLL_MS);
    return () => clearInterval(t);
  }, [load, network]);

  const pick = (n: string | null) => {
    setNetwork(n);
    load(n, false);
  };

  const rows = (() => {
    if (!data) return [];
    if (tab === "heating") return data.heating.map((h) => ({ pool: h.pool, note: h.reason }));
    return data[tab].map((pool) => ({ pool, note: undefined as string | undefined }));
  })();

  return (
    <section aria-label="Market discovery" className="space-y-4">
      <div className="scroll-x" role="group" aria-label="Network filter">
        <button type="button" className="chip" aria-pressed={network === null} onClick={() => pick(null)}>
          All chains
        </button>
        {CHAINS.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={network === c.id} onClick={() => pick(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="scroll-x" role="tablist" aria-label="Discovery lists">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="chip" onClick={() => setTab(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "organic" && <p className="text-xs text-muted">Organic rank from volume, liquidity, activity, momentum and freshness. Paid placements never change this order.</p>}

      {state === "loading" && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-[76px]" />
          ))}
        </div>
      )}

      {state === "error" && (
        <div className="glass flex flex-col items-start gap-3 p-5" role="alert">
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} className="text-down" /> {err}
          </span>
          <p className="text-sm text-muted">The free data tier is rate limited. Your view will recover on its own; you can also retry now.</p>
          <button type="button" className="btn" onClick={() => load(network, false)}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )}

      {state === "ok" && data && (
        <>
          {rows.length === 0 ? (
            <div className="glass p-6 text-sm text-soft">
              {tab === "heating" ? "No token is showing unusual volume acceleration with meaningful liquidity right now." : "No tokens match this view."}
            </div>
          ) : (
            <div className="grid gap-2">
              {rows.map((r, i) => (
                <div key={r.pool.id} className="contents">
                  <TokenRow pool={r.pool} rank={i + 1} note={r.note} />
                  {tab === "organic" && i === 4 && <AvailableSlot placement="trending" variant="wide" />}
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted">
            Data: GeckoTerminal. Updated {ageShort(data.meta.generatedAt)} ago{data.meta.stale ? " (cached, provider slow)" : ""}. Prices are DEX pool prices and can differ from other venues.
          </p>
        </>
      )}
    </section>
  );
}
