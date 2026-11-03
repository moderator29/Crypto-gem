import Link from "next/link";
import { getNetwork } from "@/lib/market-data/networks";
import type { PoolSummary } from "@/lib/market-data/types";
import { ageShort, pct, priceUsd, usdCompact } from "@/lib/utils/format";
import { TokenLogo } from "@/components/ui/TokenLogo";

export function Change({ v }: { v: number | null }) {
  return <span className={`num font-semibold ${v === null ? "text-muted" : v >= 0 ? "text-up" : "text-down"}`}>{pct(v)}</span>;
}

/** Mobile-first row: identity and price on top, key stats beneath. Grid on wider screens. */
export function TokenRow({ pool, rank, note }: { pool: PoolSummary; rank?: number; note?: string }) {
  const t = pool.baseToken;
  return (
    <Link href={`/token/${pool.networkId}/${t.address}`} className="glass-flat hover-lift grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-3.5 py-3 md:grid-cols-[28px_minmax(0,2fr)_1fr_1fr_1fr_1fr_60px]">
      {rank !== undefined && <span className="num hidden text-sm font-bold text-muted md:block">{rank}</span>}
      <TokenLogo src={t.imageUrl} symbol={t.symbol} size={40} />
      <span className="min-w-0">
        <span className="block truncate font-semibold leading-tight">
          {t.symbol} <span className="font-medium text-muted">{t.name !== t.symbol ? t.name : ""}</span>
        </span>
        <span className="block truncate text-xs text-muted">
          {getNetwork(pool.networkId)?.name ?? pool.networkId}
          {pool.dex ? ` · ${pool.dex.replace(/-/g, " ")}` : ""}
          {note ? ` · ${note}` : ""}
        </span>
      </span>
      <span className="num text-right md:text-left">
        <span className="block font-semibold">{priceUsd(pool.priceUsd)}</span>
        <span className="block text-xs md:hidden">
          <Change v={pool.change.h24} />
        </span>
      </span>
      <span className="num hidden text-sm md:block">
        <Change v={pool.change.h1} /> <span className="text-xs text-muted">1h</span>
      </span>
      <span className="num hidden text-sm md:block">
        <Change v={pool.change.h24} /> <span className="text-xs text-muted">24h</span>
      </span>
      <span className="num hidden text-sm md:block">
        {usdCompact(pool.volumeUsd.h24)} <span className="text-xs text-muted">vol</span>
      </span>
      <span className="num hidden text-sm md:block">
        {usdCompact(pool.liquidityUsd)} <span className="text-xs text-muted">liq</span>
      </span>
      <span className="num hidden text-right text-xs text-muted md:block">{ageShort(pool.createdAt)}</span>
      <span className="num col-span-3 flex gap-4 text-xs text-muted md:hidden">
        <span>Vol {usdCompact(pool.volumeUsd.h24)}</span>
        <span>Liq {usdCompact(pool.liquidityUsd)}</span>
        <span>Age {ageShort(pool.createdAt)}</span>
      </span>
    </Link>
  );
}
