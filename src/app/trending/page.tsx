import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CoinList } from "@/components/markets/CoinList";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { COIN_TABS, getCoinPage, parseCoinPage, parseCoinTab, PER_PAGE, type CoinPage } from "@/lib/market-data/coins";

export const revalidate = 120;
export const metadata: Metadata = { title: "Trending coins", description: "Explore the market: trending, gainers, losers and every coin ranked, with 7 day trends and community votes." };

/** Page numbers to show: first, last, and a window around the current page. */
function windowPages(page: number, pages: number): Array<number | "gap"> {
  const set = new Set([1, 2, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages));
  const out: Array<number | "gap"> = [];
  let prev = 0;
  for (const n of [...set].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  return out;
}

export default async function TrendingPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const sp = await searchParams;
  const tab = parseCoinTab(sp.tab);
  const page = parseCoinPage(sp.page);
  const def = COIN_TABS.find((t) => t.id === tab)!;
  let data: CoinPage | null = null;
  try {
    data = await getCoinPage(tab, page);
  } catch {
    data = null;
  }
  const href = (t: string, p: number) => `/trending?tab=${t}${p > 1 ? `&page=${p}` : ""}`;
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Trending" }]} eyebrow="Explore the market" title={def.label} description={def.blurb} />
      <div className="space-y-5">
        <div className="scroll-x" role="tablist" aria-label="Coin lists">
          {COIN_TABS.map((t) => <Link key={t.id} href={href(t.id, 1)} role="tab" aria-selected={tab === t.id} className="chip" aria-current={tab === t.id ? "page" : undefined}>{t.label}</Link>)}
          <Link href="/markets" className="chip">On-chain pools</Link>
        </div>
        {!data || data.rows.length === 0 ? (
          <EmptyState tone="error" icon={AlertTriangle} title="Coin data is unavailable" description="CoinGecko is not responding or is rate limited. Try again in a moment." action={<Link href={href(tab, page)} className="btn btn-sm">Retry</Link>} />
        ) : (
          <>
            <CoinList rows={data.rows} startRank={(data.page - 1) * PER_PAGE + 1} />
            <div className="space-y-3 text-center">
              {data.total !== null && <p className="num text-sm text-soft">{data.total.toLocaleString("en-US")} {data.capped ? "coins in this list" : "coins tracked"}</p>}
              <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
                {data.page > 1 ? <Link href={href(tab, data.page - 1)} className="btn btn-icon btn-sm" rel="prev" aria-label="Previous page"><ChevronLeft size={16} /></Link> : <span className="btn btn-icon btn-sm" aria-disabled="true"><ChevronLeft size={16} /></span>}
                {windowPages(data.page, data.pages).map((n, i) => n === "gap" ? <span key={`g${i}`} className="px-1 text-muted">...</span> : <Link key={n} href={href(tab, n)} aria-current={n === data.page ? "page" : undefined} className={`btn btn-sm !min-w-10 ${n === data.page ? "btn-primary" : ""}`}>{n}</Link>)}
                {data.page < data.pages ? <Link href={href(tab, data.page + 1)} className="btn btn-icon btn-sm" rel="next" aria-label="Next page"><ChevronRight size={16} /></Link> : <span className="btn btn-icon btn-sm" aria-disabled="true"><ChevronRight size={16} /></span>}
              </nav>
              <p className="text-[11px] text-muted">Source CoinGecko. Prices are aggregated market prices. Votes are from signed-in visitors, one per coin per day.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
