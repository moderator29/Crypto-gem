"use client";

import { AlertTriangle, Flame, RefreshCw, Sparkles, TrendingDown, TrendingUp, BarChart3, Zap } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomeData } from "@/lib/market-data/home";
import { NETWORKS } from "@/lib/market-data/networks";
import { ageShort } from "@/lib/utils/format";
import { AvailableSlot } from "./AdSlots";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { PoolSummary } from "@/lib/market-data/types";
import { ROW_COLS, TokenRow } from "./TokenRow";

const TABS = [
  { id: "organic", key: "tab.trending", icon: Zap },
  { id: "heating", key: "tab.heating", icon: Flame },
  { id: "fresh", key: "tab.newPairs", icon: Sparkles },
  { id: "gainers", key: "tab.gainers", icon: TrendingUp },
  { id: "losers", key: "tab.losers", icon: TrendingDown },
  { id: "volume", key: "tab.volume", icon: BarChart3 },
] as const satisfies ReadonlyArray<{ id: string; key: MessageKey; icon: unknown }>;
type TabId = (typeof TABS)[number]["id"];

const CHAINS = NETWORKS.filter((n) => n.geckoterminal && ["ethereum", "solana", "bsc", "base", "arbitrum", "polygon", "avalanche", "optimism", "ton", "tron", "sui", "robinhood"].includes(n.id));
const POLL_MS = 45_000;

type SortKey = "price" | "h1" | "h24" | "volume" | "liquidity" | "age";
const SORTERS: Record<SortKey, (p: PoolSummary) => number | null> = {
  price: (p) => p.priceUsd,
  h1: (p) => p.change.h1,
  h24: (p) => p.change.h24,
  volume: (p) => p.volumeUsd.h24,
  liquidity: (p) => p.liquidityUsd,
  age: (p) => (p.createdAt ? Date.parse(p.createdAt) : null),
};
const COLUMNS: Array<{ key: SortKey; label: string; lgOnly?: boolean }> = [
  { key: "price", label: "Price" },
  { key: "h1", label: "1h", lgOnly: true },
  { key: "h24", label: "24h" },
  { key: "volume", label: "Volume" },
  { key: "liquidity", label: "Liquidity", lgOnly: true },
  { key: "age", label: "Age", lgOnly: true },
];

export function MarketBoard({ initial, initialNetwork = null }: { initial: HomeData | null; initialNetwork?: string | null }) {
  const { t: tr } = useT();
  const [data, setData] = useState<HomeData | null>(initial);
  const [tab, setTab] = useState<TabId>("organic");
  const [network, setNetwork] = useState<string | null>(initialNetwork);
  const [state, setState] = useState<"ok" | "loading" | "error">(initial ? "ok" : "error");
  const [err, setErr] = useState<string | null>(initial ? null : "Market data is temporarily unavailable.");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
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
    const base = tab === "heating" ? data.heating.map((h) => ({ pool: h.pool, note: h.reason })) : data[tab].map((pool) => ({ pool, note: undefined as string | undefined }));
    if (!sort) return base;
    const f = SORTERS[sort.key];
    // Missing values always sink to the bottom, whichever direction is chosen.
    return [...base].sort((a, b) => {
      const x = f(a.pool);
      const y = f(b.pool);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return sort.dir === "desc" ? y - x : x - y;
    });
  })();

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s?.key !== key ? { key, dir: "desc" } : s.dir === "desc" ? { key, dir: "asc" } : null));

  return (
    <section aria-label="Market discovery" className="space-y-4">
      <div className="scroll-x" role="group" aria-label="Network filter">
        <button type="button" className="chip" aria-pressed={network === null} onClick={() => pick(null)}>
          {tr("chain.all")}
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
            <t.icon size={14} /> {tr(t.key)}
          </button>
        ))}
      </div>

      {tab === "organic" && <p className="text-xs text-muted">{tr("market.organicNote")}</p>}

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
              <div className={`sticky top-[calc(var(--header-h)+4px)] z-10 hidden items-center gap-x-3 rounded-xl border border-line bg-[var(--surface-solid)] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-muted md:grid ${ROW_COLS}`} role="row">
                <span>#</span>
                <span>Token</span>
                {COLUMNS.map((c) => (
                  <button key={c.key} type="button" onClick={() => toggleSort(c.key)} className={`items-center gap-1 text-left uppercase transition hover:text-text ${c.lgOnly ? "hidden lg:flex" : "flex"} ${c.key === "age" ? "justify-end" : ""} ${sort?.key === c.key ? "text-text" : ""}`} aria-label={`Sort by ${c.label}`}>
                    {c.label}
                    {sort?.key === c.key && (sort.dir === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                  </button>
                ))}
                <span />
              </div>
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
