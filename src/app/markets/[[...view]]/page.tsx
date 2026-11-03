import { AlertTriangle, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceTable } from "@/components/markets/PriceTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkTabs } from "@/components/ui/LinkTabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { getMarketList, MAX_PAGE, parseDir, parsePage, parseSort, parseView, sortPools, VIEWS, type MarketList, type SortDir, type SortKey } from "@/lib/market-data/lists";
import { getNetwork, NETWORKS } from "@/lib/market-data/networks";

export const revalidate = 30;

type Props = { params: Promise<{ view?: string[] }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = parseView((await params).view?.[0]);
  const v = VIEWS.find((x) => x.id === view);
  return { title: v ? `${v.label} markets` : "Markets", description: v?.blurb };
}

const CHAINS = NETWORKS.filter((n) => n.geckoterminal && ["ethereum", "solana", "bsc", "base", "arbitrum", "optimism", "polygon", "avalanche", "ton", "tron", "sui", "robinhood"].includes(n.id));

export default async function MarketsPage({ params, searchParams }: Props) {
  const segs = (await params).view ?? [];
  if (segs.length > 1) notFound();
  const view = parseView(segs[0]);
  if (!view) notFound();
  const sp = await searchParams;
  const network = sp.network && getNetwork(sp.network)?.geckoterminal ? sp.network : null;
  if (sp.network && !network) notFound();
  const page = parsePage(sp.page);
  const sort = parseSort(sp.sort);
  const dir: SortDir = parseDir(sp.dir);
  const def = VIEWS.find((v) => v.id === view)!;

  let list: MarketList | null = null;
  try {
    list = await getMarketList(view, network, page);
  } catch {
    list = null;
  }

  const qs = (over: { network?: string | null; sort?: SortKey | null; dir?: SortDir | null; page?: number }) => {
    const q = new URLSearchParams();
    const n = over.network === undefined ? network : over.network;
    const s = over.sort === undefined ? sort : over.sort;
    if (n) q.set("network", n);
    if (s) {
      q.set("sort", s);
      q.set("dir", (over.dir ?? dir) as string);
    }
    if (over.page && over.page > 1) q.set("page", String(over.page));
    const str = q.toString();
    return str ? `?${str}` : "";
  };
  const tabs = [...VIEWS.map((v) => ({ href: `${v.path}${network ? `?network=${network}` : ""}`, label: v.label })), { href: "/markets/map", label: "Map" }];
  const activeHref = `${def.path}${network ? `?network=${network}` : ""}`;
  const rows = list ? sortPools(list.pools, sort, dir) : [];

  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Markets", href: "/markets" }, ...(view !== "trending" ? [{ label: def.label }] : [])]} eyebrow="Markets" title={def.label} description={def.blurb} />

      <div className="space-y-5">
        <LinkTabs tabs={tabs} activeHref={activeHref} label="Market views" />
        {!list ? (
          <EmptyState tone="error" icon={AlertTriangle} title="Market data is unavailable" description="The data provider is not responding or is rate limited. Try again in a moment." action={<Link href={`${def.path}${qs({})}`} className="btn btn-sm">Retry</Link>} />
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="Nothing matches this view" description={view === "heating" ? "No pool is running well above its own hourly pace with meaningful liquidity right now." : "No pools were returned for this chain and view."} action={network ? <Link href={def.path} className="btn btn-sm">Clear chain filter</Link> : undefined} />
        ) : (
          <>
            <PriceTable pools={rows} startRank={list.paged ? (page - 1) * 20 + 1 : 1} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                Source GeckoTerminal · {list.sampled} pools {list.paged ? `on page ${page}` : "sampled"}{list.stale ? " · cached, provider slow" : ""}. Prices are DEX pool prices and can differ from other venues. {!list.paged && "Ranked within the pools we sample, not the whole market."}
              </p>
              {list.paged && (
                <nav aria-label="Pagination" className="flex items-center gap-2">
                  {page > 1 ? <Link href={`${def.path}${qs({ page: page - 1 })}`} className="btn btn-sm" rel="prev"><ChevronLeft size={15} /> Previous</Link> : <span className="btn btn-sm" aria-disabled="true"><ChevronLeft size={15} /> Previous</span>}
                  <span className="num text-sm text-soft">Page {page} of {MAX_PAGE}</span>
                  {list.hasMore ? <Link href={`${def.path}${qs({ page: page + 1 })}`} className="btn btn-sm" rel="next">Next <ChevronRight size={15} /></Link> : <span className="btn btn-sm" aria-disabled="true">Next <ChevronRight size={15} /></span>}
                </nav>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
