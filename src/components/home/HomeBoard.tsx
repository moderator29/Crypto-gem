"use client";

import { BarChart3, Clock3, Flame, Grid2x2, Star, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { setDisplayPrefs, useDisplayPrefs } from "@/lib/displayPrefs";
import { useT } from "@/components/i18n/I18nProvider";
import { HeatMap } from "@/components/markets/HeatMap";
import { ChainFilter } from "@/components/markets/ChainFilter";
import { PriceTable } from "@/components/markets/PriceTable";
import { getNetwork } from "@/lib/market-data/networks";
import { sortPools, type SortDir, type SortKey } from "@/lib/market-data/lists";
import type { HomeData } from "@/lib/market-data/home";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PoolSummary } from "@/lib/market-data/types";

const TABS = [
  { id: "organic", key: "tab.trending", icon: Zap },
  { id: "heating", key: "tab.heating", icon: Flame },
  { id: "fresh", key: "tab.newPairs", icon: Clock3 },
  { id: "gainers", key: "tab.gainers", icon: TrendingUp },
  { id: "losers", key: "tab.losers", icon: TrendingDown },
  { id: "volume", key: "tab.volume", icon: BarChart3 },
] as const satisfies ReadonlyArray<{ id: string; key: MessageKey; icon: unknown }>;
type TabId = (typeof TABS)[number]["id"] | "map";

/** The home price board: one list with view tabs, a price map tab, and a link to the watchlist. */
export function HomeBoard({ data, boosted }: { data: HomeData; boosted?: string[] }) {
  const boostedSet = useMemo(() => new Set(boosted ?? []), [boosted]);
  const { t } = useT();
  const [tab, setTab] = useState<TabId>("organic");
  const prefs = useDisplayPrefs();
  const [viewOpen, setViewOpen] = useState(false);
  const [chain, setChain] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (TABS.some((x) => x.id === id)) setTab(id as TabId);
    };
    window.addEventListener("cg:tab", on);
    return () => window.removeEventListener("cg:tab", on);
  }, []);
  const lists: Record<(typeof TABS)[number]["id"], PoolSummary[]> = useMemo(() => ({
    organic: data.organic,
    heating: data.heating.map((h) => h.pool),
    fresh: data.fresh,
    gainers: data.gainers,
    losers: data.losers,
    volume: data.volume,
  }), [data]);
  const mapPools = useMemo(() => [...new Map([...data.organic, ...data.fresh, ...data.volume, ...data.gainers, ...data.losers].map((p) => [p.id, p])).values()], [data]);
  const base = useMemo(() => (tab === "map" ? [] : lists[tab]), [tab, lists]);
  const chainOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of base) counts.set(p.networkId, (counts.get(p.networkId) ?? 0) + 1);
    return [{ id: null, label: "All chains", count: base.length }, ...[...counts].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, label: getNetwork(id)?.name ?? id, count }))];
  }, [base]);
  const activeChain = chain && chainOptions.some((o) => o.id === chain) ? chain : null;
  const rows = sortPools(activeChain ? base.filter((p) => p.networkId === activeChain) : base, sort?.key ?? null, sort?.dir ?? "desc").slice(0, 30);

  return (
    <section id="market" aria-label="Markets" className="scroll-mt-20 space-y-3">
      <LayoutGroup id="board-tabs"><div className="scroll-x" role="tablist" aria-label="Market views">
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className="chip tab-spring" onClick={() => setTab(x.id)}>
            {tab === x.id && <motion.span layoutId="board-tab" transition={{ type: "spring", stiffness: 420, damping: 36 }} className="tab-spring-bg" />}
            <span className="relative z-10 inline-flex items-center gap-1.5"><x.icon size={14} aria-hidden="true" /> {t(x.key)}</span>
          </button>
        ))}
        <button type="button" role="tab" aria-selected={tab === "map"} className="chip tab-spring" onClick={() => setTab("map")}>
          {tab === "map" && <motion.span layoutId="board-tab" transition={{ type: "spring", stiffness: 420, damping: 36 }} className="tab-spring-bg" />}
          <span className="relative z-10 inline-flex items-center gap-1.5"><Grid2x2 size={14} aria-hidden="true" /> Map</span>
        </button>
        <Link href="/dashboard/watchlist" className="chip"><Star size={14} aria-hidden="true" /> Watchlist</Link>
      </div></LayoutGroup>
      {tab !== "map" && <div className="flex flex-wrap items-center gap-2"><ChainFilter options={chainOptions} value={activeChain} onChange={setChain} />{sort && <button type="button" className="chip" onClick={() => setSort(null)}>Clear sort</button>}
        <div className="relative ml-auto">
          <button type="button" className="btn" aria-expanded={viewOpen} onClick={() => setViewOpen((o) => !o)}><SlidersHorizontal size={15} aria-hidden="true" /> View</button>
          {viewOpen && (
            <div className="glass-float absolute right-0 top-[calc(100%+8px)] z-30 w-64 space-y-1 !bg-[var(--surface-2)] p-2">
              {([["charts", "Mini charts", "7 day trend on each row"], ["compact", "Compact rows", "Show more tokens at once"]] as const).map(([k, label, hint]) => (
                <button key={k} type="button" role="switch" aria-checked={prefs[k]} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[var(--surface-3)]" onClick={() => setDisplayPrefs({ [k]: !prefs[k] })}>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold normal-case tracking-normal">{label}</span><span className="block text-xs font-normal normal-case tracking-normal text-muted">{hint}</span></span>
                  <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${prefs[k] ? "bg-[var(--brand)]" : "bg-[var(--surface-3)]"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${prefs[k] ? "left-[18px]" : "left-0.5"}`} /></span>
                </button>
              ))}
            </div>
          )}
        </div></div>}
      {tab === "map" ? <HeatMap pools={mapPools} /> : rows.length > 0 ? <PriceTable pools={rows} boosted={boostedSet} sorting={{ sort: sort?.key ?? null, dir: sort?.dir ?? "desc", onSort: (key, next) => setSort(next ? { key, dir: next } : null) }} /> : <p className="card p-8 text-center text-sm text-muted">Nothing to show in this view right now.</p>}
      <p className="text-[11px] text-muted">Source GeckoTerminal. Pool level DEX data for the pools we sample. Trend lines are the last 7 days of real candles.</p>
    </section>
  );
}
