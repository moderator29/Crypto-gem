import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { ChainBadge } from "@/components/ui/ChainBadge";
import type { HomeData } from "@/lib/market-data/home";
import type { ChainPulse } from "@/lib/market-data/pulse";
import { ageShort, usdCompact } from "@/lib/utils/format";

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card-flat p-4">
      <p className="eyebrow">{label}</p>
      <p className="num mt-2.5 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}


/** Measured read on the market: figures describe the pools we sample, and the card says so. */
export function OverviewCard({ data, chains }: { data: HomeData | null; chains: ChainPulse[] }) {
  const pools = data ? [...new Map([...data.organic, ...data.fresh, ...data.volume].map((p) => [p.id, p])).values()] : [];
  const volume = pools.reduce((s, p) => s + (p.volumeUsd.h24 ?? 0), 0);
  // Time base is when the data was produced, so the count describes that snapshot.
  const asOf = data ? Date.parse(data.meta.generatedAt) : 0;
  const newDay = pools.filter((p) => p.createdAt && asOf - Date.parse(p.createdAt) < 86_400_000).length;
  return (
    <div className="card card-lit p-5 md:p-6">

          <div className="mb-4 flex items-center justify-between">
            <h2 className="h3">Market overview</h2>
            <Link href="/pulse" className="text-xs font-semibold text-brand hover:text-text">Market Pulse</Link>
          </div>
          {data ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="24h volume" value={usdCompact(volume)} note="Across sampled pools" />
                <Stat label="Pools sampled" value={String(pools.length)} note="Trending, new and top" />
                <Stat label="New pairs" value={String(newDay)} note="Created in the last 24h" />
                <Stat label="Active chains" value={String(chains.length)} note="With sampled activity" />
              </div>
              <p className="mt-4 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                <span className="live-dot" aria-hidden="true" /> Source GeckoTerminal · updated {ageShort(data.meta.generatedAt)} ago{data.meta.stale ? " · cached, provider slow" : ""}. Figures describe the pools we sample, not the whole market.
              </p>
            </>
          ) : (
            <p className="text-sm text-soft" role="status">Market data is temporarily unavailable. The overview returns when the data provider does.</p>
          )}
    </div>
  );
}

/** First screen: what this is, a way in (search or paste a contract), and a measured read on the market right now. */
export function HomeHero({ data, chains }: { data: HomeData | null; chains: ChainPulse[] }) {
  return (
    <section aria-label="Discover" className="grid items-center gap-8 py-2 lg:grid-cols-12 lg:gap-10 lg:py-6">
      <div className="lg:col-span-7">
        <p className="eyebrow mb-4 flex items-center gap-2"><span className="live-dot" aria-hidden="true" /> Multi-chain discovery</p>
        <h1 className="h-display max-w-[16ch] !text-[2rem] sm:!text-[clamp(2.1rem,5.4vw,3.75rem)]">Discover what is moving across crypto.</h1>
        <p className="mt-3 max-w-xl text-[15px] text-soft md:mt-4 md:text-lg">Live pools, new pairs and token intelligence on every major chain. Search by name or paste a contract address.</p>
        <form action="/search" method="get" role="search" className="mt-5 flex max-w-xl flex-col gap-2.5 sm:flex-row md:mt-7">
          <label className="relative block flex-1">
            <span className="sr-only">Search tokens or paste a contract address</span>
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" type="search" required minLength={2} maxLength={100} autoComplete="off" spellCheck={false} placeholder="Search a token or paste a contract" className="input !min-h-[var(--h-lg)] !pl-11" />
          </label>
          <button type="submit" className="btn btn-primary btn-lg">Search <ArrowRight size={16} /></button>
        </form>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Chains</span>
          {chains.slice(0, 6).map((c, i) => (
            <Link key={c.networkId} href={`/chains/${c.networkId}`} className={`${i > 3 ? "hidden sm:inline-flex" : "inline-flex"} items-center gap-1.5 rounded-full border border-line bg-[var(--surface-1)] py-1 pl-1 pr-3 text-xs font-semibold text-soft transition hover:border-[var(--line-2)] hover:text-text`}>
              <ChainBadge networkId={c.networkId} size={20} /> {c.name}
            </Link>
          ))}
          <Link href="/chains" className="text-xs font-semibold text-brand hover:text-text">All chains</Link>
        </div>
      </div>

      <div className="hidden lg:col-span-5 lg:block"><OverviewCard data={data} chains={chains} /></div>
    </section>
  );
}
