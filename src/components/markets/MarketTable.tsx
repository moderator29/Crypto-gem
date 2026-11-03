import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { ROW_COLS } from "@/components/home/rowCols";
import { TokenRow } from "@/components/home/TokenRow";
import type { SortDir, SortKey } from "@/lib/market-data/lists";
import type { PoolSummary } from "@/lib/market-data/types";

const COLS: Array<{ key: SortKey; label: string; lgOnly?: boolean }> = [
  { key: "price", label: "Price" },
  { key: "h1", label: "1h", lgOnly: true },
  { key: "h24", label: "24h" },
  { key: "volume", label: "Volume" },
  { key: "liquidity", label: "Liquidity", lgOnly: true },
  { key: "age", label: "Age", lgOnly: true },
];

/**
 * Server-rendered market table. Column headers are links, so sorting has a URL, history and works
 * without JavaScript. Rows expand in place and link on to the token page.
 */
export function MarketTable({ pools, sort, dir, sortHref, startRank = 1 }: { pools: PoolSummary[]; sort: SortKey | null; dir: SortDir; sortHref?: (key: SortKey, nextDir: SortDir | null) => string; startRank?: number }) {
  return (
    <div className="grid gap-2">
      <div className={`sticky top-[calc(var(--header-h)+6px)] z-10 hidden items-center gap-x-3 rounded-xl border border-line bg-[var(--surface-1)] px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted md:grid ${ROW_COLS}`}>
        <span>#</span>
        <span>Token</span>
        {COLS.map((c) => {
          const active = sort === c.key;
          const next: SortDir | null = !active ? "desc" : dir === "desc" ? "asc" : null;
          const cls = `items-center gap-1 transition hover:text-text ${c.lgOnly ? "hidden lg:flex" : "flex"} ${c.key === "age" ? "justify-end" : ""} ${active ? "text-text" : ""}`;
          return sortHref ? (
            <Link key={c.key} href={sortHref(c.key, next)} className={cls} aria-label={`Sort by ${c.label}`} scroll={false}>
              {c.label}
              {active && (dir === "desc" ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />)}
            </Link>
          ) : (
            <span key={c.key} className={cls}>{c.label}</span>
          );
        })}
        <span />
      </div>
      {pools.map((p, i) => (
        <TokenRow key={p.id} pool={p} rank={startRank + i} />
      ))}
    </div>
  );
}
