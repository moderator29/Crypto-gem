import type { RankedPool } from "@/lib/market-data/home";
import { ROW_COLS } from "./rowCols";
import { TokenRow } from "./TokenRow";

/** Top of the organic ranking as a compact table. The full, filterable table lives on /markets. */
export function HomeMarkets({ rows }: { rows: RankedPool[] }) {
  return (
    <div className="grid gap-2">
      <div className={`hidden items-center gap-x-3 px-3.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted md:grid ${ROW_COLS}`}>
        <span>#</span>
        <span>Token</span>
        <span>Price</span>
        <span className="hidden lg:block">1h</span>
        <span>24h</span>
        <span>Volume</span>
        <span className="hidden lg:block">Liquidity</span>
        <span className="hidden text-right lg:block">Age</span>
        <span />
      </div>
      {rows.map((p, i) => (
        <TokenRow key={p.id} pool={p} rank={i + 1} />
      ))}
    </div>
  );
}
