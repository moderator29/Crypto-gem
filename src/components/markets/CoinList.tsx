import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { StaticSpark } from "@/components/markets/StaticSpark";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { TokenVote } from "@/components/votes/TokenVote";
import type { CoinRow } from "@/lib/market-data/providers/coingecko";
import { priceUsd, usdCompact } from "@/lib/utils/format";

function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="num text-xs text-muted">{"—"}</span>;
  return (
    <span className={`num inline-flex items-center gap-0.5 text-xs font-semibold ${v >= 0 ? "text-up" : "text-down"}`}>
      {v >= 0 ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />}
      {Math.abs(v).toFixed(2)}%
    </span>
  );
}

const COLS = "grid-cols-[34px_minmax(0,1fr)_auto_92px] md:grid-cols-[52px_minmax(0,1.6fr)_minmax(0,1fr)_88px_minmax(0,1fr)_minmax(0,1fr)_100px_96px]";

/** Long ranked list of real coins. Rank is the position on this list. Every row links to its coin page and carries an upvote box. */
export function CoinList({ rows, startRank }: { rows: CoinRow[]; startRank: number }) {
  return (
    <div className="card overflow-hidden">
      <div className={`grid items-center gap-x-3 border-b border-line px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted ${COLS}`}>
        <span>#</span>
        <span>Name</span>
        <span className="text-right md:text-left">Price</span>
        <span className="hidden md:block">24h</span>
        <span className="hidden md:block">Market cap</span>
        <span className="hidden md:block">24h volume</span>
        <span className="hidden md:block">7d trend</span>
        <span className="text-right">Votes</span>
      </div>
      <ol>
        {rows.map((c, i) => (
          <li key={c.id} style={{ ["--i" as string]: Math.min(i, 14) }} className={`row-in relative grid items-center gap-x-3 border-b border-line px-3 py-3 transition last:border-0 hover:bg-[var(--surface-2)] ${COLS}`}>
            <span className="num text-sm font-semibold text-muted">{startRank + i}</span>
            <span className="flex min-w-0 items-center gap-3">
              <TokenLogo src={c.image} symbol={c.symbol} size={36} />
              <span className="min-w-0">
                <Link href={`/coin/${c.id}`} className="block truncate text-[15px] font-bold uppercase leading-tight tracking-tight after:absolute after:inset-0 after:content-['']">{c.symbol}</Link>
                <span className="block truncate text-xs text-muted">{c.name}</span>
              </span>
            </span>
            <span className="num flex flex-col items-end md:items-start">
              <span className="text-sm font-semibold">{priceUsd(c.priceUsd)}</span>
              <span className="md:hidden"><Delta v={c.change24h} /></span>
            </span>
            <span className="hidden md:block"><Delta v={c.change24h} /></span>
            <span className="num hidden text-sm md:block">{usdCompact(c.marketCapUsd)}</span>
            <span className="num hidden text-sm md:block">{usdCompact(c.volume24hUsd)}</span>
            <span className="hidden md:block"><StaticSpark points={c.spark} /></span>
            <span className="flex justify-end"><TokenVote network="cg" address={c.id} /></span>
          </li>
        ))}
      </ol>
    </div>
  );
}
