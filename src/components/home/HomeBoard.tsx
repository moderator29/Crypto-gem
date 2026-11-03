"use client";

import { BarChart3, Clock3, Flame, Grid2x2, Star, TrendingDown, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import { HeatMap } from "@/components/markets/HeatMap";
import { PriceTable } from "@/components/markets/PriceTable";
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
export function HomeBoard({ data }: { data: HomeData }) {
  const { t } = useT();
  const [tab, setTab] = useState<TabId>("organic");
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
  const rows = tab === "map" ? [] : lists[tab].slice(0, 20);

  return (
    <section id="market" aria-label="Markets" className="scroll-mt-20 space-y-3">
      <div className="scroll-x" role="tablist" aria-label="Market views">
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className="chip" onClick={() => setTab(x.id)}>
            <x.icon size={14} aria-hidden="true" /> {t(x.key)}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={tab === "map"} className="chip" onClick={() => setTab("map")}>
          <Grid2x2 size={14} aria-hidden="true" /> Map
        </button>
        <Link href="/dashboard/watchlist" className="chip"><Star size={14} aria-hidden="true" /> Watchlist</Link>
      </div>
      {tab === "map" ? <HeatMap pools={mapPools} /> : rows.length > 0 ? <PriceTable pools={rows} /> : <p className="card p-8 text-center text-sm text-muted">Nothing to show in this view right now.</p>}
      <p className="text-[11px] text-muted">Source GeckoTerminal. Pool level DEX data for the pools we sample. Trend lines are the last 7 days of real candles.</p>
    </section>
  );
}
