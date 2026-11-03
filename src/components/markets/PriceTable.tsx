import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import type { SortDir, SortKey } from "@/lib/market-data/lists";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { PoolSummary } from "@/lib/market-data/types";
import { priceUsd, usdCompact } from "@/lib/utils/format";
import { Sparkline } from "./Sparkline";
import { WatchStar } from "./WatchStar";

const COLS = "grid-cols-[32px_minmax(0,1fr)_auto_68px] md:grid-cols-[36px_32px_minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_132px]";

function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="num text-xs text-muted">{"—"}</span>;
  const up = v >= 0;
  return (
    <span className={`num inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-up" : "text-down"}`}>
      {up ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />}
      {Math.abs(v).toFixed(2)}%
    </span>
  );
}

export interface SortProps {
  sort: SortKey | null;
  dir: SortDir;
  /** Link mode (server pages): every header is a real URL. */
  sortHref?: (key: SortKey, next: SortDir | null) => string;
  /** Button mode (client boards). */
  onSort?: (key: SortKey, next: SortDir | null) => void;
}

function Head({ k, label, className = "", sp }: { k: SortKey; label: string; className?: string; sp?: SortProps }) {
  if (!sp || (!sp.sortHref && !sp.onSort)) return <span className={className}>{label}</span>;
  const active = sp.sort === k;
  const next: SortDir | null = !active ? "desc" : sp.dir === "desc" ? "asc" : null;
  const inner = (
    <>
      {label}
      {active && (sp.dir === "desc" ? <ArrowDown size={11} aria-hidden="true" /> : <ArrowUp size={11} aria-hidden="true" />)}
    </>
  );
  const cls = `inline-flex items-center gap-1 uppercase transition hover:text-text ${active ? "text-text" : ""} ${className}`;
  return sp.sortHref ? (
    <Link href={sp.sortHref(k, next)} scroll={false} className={cls} aria-label={`Sort by ${label}`}>{inner}</Link>
  ) : (
    <button type="button" onClick={() => sp.onSort?.(k, next)} className={cls} aria-label={`Sort by ${label}`}>{inner}</button>
  );
}

/** Price board: watch star, rank, token, price with 24h change beneath, cap, volume and a real 7 day trend. */
export function PriceTable({ pools, startRank = 1, sorting }: { pools: PoolSummary[]; startRank?: number; sorting?: SortProps }) {
  return (
    <div className="card overflow-hidden">
      <div className={`grid items-center gap-x-2 border-b border-line px-2.5 py-2.5 text-[11px] md:gap-x-3 md:px-3 font-semibold uppercase tracking-wider text-muted ${COLS}`}>
        <span />
        <span className="hidden md:block">#</span>
        <span>Name</span>
        <span className="flex items-center justify-end gap-2 md:justify-start"><Head k="price" label="Price" sp={sorting} /><Head k="h24" label="24h" sp={sorting} /></span>
        <span className="hidden md:block"><Head k="cap" label="Cap / FDV" sp={sorting} /></span>
        <span className="hidden md:block"><Head k="volume" label="24h volume" sp={sorting} /></span>
        <span className="text-right md:text-left">7d trend</span>
      </div>
      <ul>
        {pools.map((p, i) => {
          const t = p.baseToken;
          const cap = p.marketCapUsd && p.marketCapUsd > 0 ? p.marketCapUsd : p.fdvUsd;
          return (
            <li key={p.id} className={`relative grid items-center gap-x-2 border-b border-line px-2.5 py-2.5 md:gap-x-3 md:px-3 transition last:border-0 hover:bg-[var(--surface-2)] ${COLS}`}>
              <WatchStar network={p.networkId} address={t.address} symbol={t.symbol} />
              <span className="num hidden text-sm text-muted md:block">{startRank + i}</span>
              <span className="flex min-w-0 items-center gap-3">
                <TokenLogo src={t.imageUrl} symbol={t.symbol} size={34} networkId={p.networkId} address={t.address} />
                <span className="min-w-0">
                  <Link href={`/token/${p.networkId}/${t.address}`} className="block truncate text-sm font-semibold leading-tight after:absolute after:inset-0 after:content-['']">
                    {t.name || t.symbol}
                  </Link>
                  <span className="block truncate text-xs uppercase text-muted">{t.symbol}</span>
                </span>
              </span>
              <span className="num flex flex-col items-end md:items-start">
                <span className="text-sm font-semibold">{priceUsd(p.priceUsd)}</span>
                <Delta v={p.change.h24} />
              </span>
              <span className="num hidden flex-col md:flex">
                <span className="text-sm font-semibold">{usdCompact(cap)}</span>
                <span className="text-xs text-muted">{p.fdvUsd && p.fdvUsd !== cap ? usdCompact(p.fdvUsd) : ""}</span>
              </span>
              <span className="num hidden text-sm font-semibold md:block">{usdCompact(p.volumeUsd.h24)}</span>
              <span className="flex justify-end md:justify-start"><Sparkline network={p.networkId} pool={p.address} width={68} height={28} /></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
