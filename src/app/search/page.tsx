import { Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MiniList } from "@/components/home/MiniList";
import { RecentSearches, RememberSearch } from "@/components/search/RecentSearches";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { classifyAddress } from "@/lib/market-data/identifiers";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { dedupeByToken } from "@/lib/market-data/ranking";
import { getNetwork } from "@/lib/market-data/networks";
import type { PoolSummary } from "@/lib/market-data/types";
import { cleanQuery } from "@/lib/search";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string }> };

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: Props) {
  const q = cleanQuery((await searchParams).q);
  let pools: PoolSummary[] = [];
  let failed = false;
  if (q.length >= 2) {
    try {
      pools = dedupeByToken((await geckoTerminal.searchPools(q)).pools).slice(0, 30);
    } catch {
      failed = true;
    }
  }
  const isAddress = classifyAddress(q) !== "unknown";
  const networks = [...new Set(pools.map((p) => getNetwork(p.networkId)?.name ?? p.networkId))];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]} title={q ? `Results for “${q}”` : "Search"} description="Find any token by name or symbol, or paste a contract address to detect its network." />
      <form action="/search" method="get" role="search" className="flex flex-col gap-2.5 sm:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">Search tokens or paste a contract address</span>
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" type="search" defaultValue={q} minLength={2} maxLength={100} required autoComplete="off" spellCheck={false} placeholder="Name, symbol or contract address" className="input !pl-11" />
        </label>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {!q ? (
        <RecentSearches />
      ) : q.length < 2 ? (
        <EmptyState icon={SearchX} title="Type at least two characters" />
      ) : failed ? (
        <EmptyState tone="error" icon={SearchX} title="Search is temporarily unavailable" description="The data provider is not responding or is rate limited. Try again in a moment." action={<Link href={`/search?q=${encodeURIComponent(q)}`} className="btn btn-sm">Retry</Link>} />
      ) : pools.length === 0 ? (
        <EmptyState icon={SearchX} title="No pools found" description={isAddress ? "No trading pool exists for this address on any network we index. If it is your token, you can still apply to be listed." : "Try a different spelling, the ticker, or paste the contract address."} action={isAddress ? <Link href="/add-coin" className="btn btn-primary btn-sm">Apply to list this token</Link> : undefined} />
      ) : (
        <>
          <RememberSearch q={q} />
          <p className="text-sm text-muted">{pools.length} token{pools.length === 1 ? "" : "s"} across {networks.length} network{networks.length === 1 ? "" : "s"}. The same symbol can exist on many networks, so check the network and address before you trade.</p>
          <MiniList pools={pools.map((pool) => ({ pool }))} />
        </>
      )}
    </div>
  );
}
