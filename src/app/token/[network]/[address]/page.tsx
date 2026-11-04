import { ArrowUpRight, Bot, ExternalLink, ShieldAlert, Info, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailableSlot } from "@/components/home/AdSlots";
import { Change } from "@/components/home/TokenRow";
import { PriceChart } from "@/components/token/PriceChart";
import { VoteButton } from "@/components/token/VoteButton";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { WatchButton } from "@/components/dashboard/WatchButton";
import { getBoostedKeys } from "@/lib/ads/boosted";
import { NavIcon } from "@/components/ui/NavIcon";
import { ShareButton } from "@/components/ui/ShareButton";
import { getHomeData } from "@/lib/market-data/home";
import { dexscreener } from "@/lib/market-data/providers/dexscreener";
import { QuickAlert } from "@/components/account/QuickAlert";
import { StickyPriceBar } from "@/components/token/StickyPriceBar";
import { ViewTracker } from "@/components/token/ViewTracker";
import { BuyPanel } from "@/components/token/BuyPanel";
import { RiskPanel } from "@/components/token/RiskPanel";
import { CopyButton } from "@/components/ui/CopyButton";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { classifyAddress, normalizeAddress } from "@/lib/market-data/identifiers";
import { explorerTokenUrl, getNetwork } from "@/lib/market-data/networks";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { marketRiskSignals } from "@/lib/risk";
import { tradeLinks } from "@/lib/trade-links";
import { ageShort, priceUsd, shortAddress, usdCompact } from "@/lib/utils/format";

export const revalidate = 30;

type Params = { network: string; address: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { network, address } = await params;
  return { title: `Token ${shortAddress(address)} on ${getNetwork(network)?.name ?? network}` };
}

export default async function TokenPage({ params }: { params: Promise<Params> }) {
  const { network: networkId, address: raw } = await params;
  const net = getNetwork(networkId);
  const address = decodeURIComponent(raw);
  if (!net?.geckoterminal || classifyAddress(address) === "unknown") notFound();
  const canonical = normalizeAddress(address);

  const [poolsRes, tokenRes] = await Promise.allSettled([geckoTerminal.poolsForToken(net.geckoterminal, canonical), geckoTerminal.token(net.geckoterminal, canonical)]);
  const pools = poolsRes.status === "fulfilled" ? poolsRes.value.pools : [];
  const info = tokenRes.status === "fulfilled" ? tokenRes.value : null;
  if (!info && pools.length === 0) {
    if (poolsRes.status === "rejected" && tokenRes.status === "rejected") {
      const kind = (poolsRes.reason as { kind?: string })?.kind;
      if (kind !== "not_found") {
        return (
          <div className="card mx-auto mt-10 max-w-lg p-6" role="alert">
            <h1 className="font-display text-xl font-bold">Market data is temporarily unavailable</h1>
            <p className="mt-2 text-sm text-soft">We could not reach the data provider. Reload in a minute.</p>
          </div>
        );
      }
    }
    notFound();
  }

  const sorted = [...pools].sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
  const top = sorted[0];
  const identity = info?.identity ?? (top && top.baseToken.address.toLowerCase() === canonical.toLowerCase() ? top.baseToken : top?.quoteToken ?? top?.baseToken) ?? null;
  const price = info?.priceUsd ?? top?.priceUsd ?? null;
  const risks = marketRiskSignals(sorted);
  const isBoosted = (await getBoostedKeys().catch(() => new Set<string>())).has(`${net.id}:${canonical}`);
  const trade = tradeLinks(net.id, canonical, top?.address);
  const solUsd = net.id === "solana" ? await geckoTerminal.token("solana", "So11111111111111111111111111111111111111112").then((t) => t.priceUsd).catch(() => null) : null;
  const explorer = explorerTokenUrl(net.id, canonical);
  const ds = await dexscreener.tokenPairs(canonical).then((pairs) => dexscreener.toInfo(pairs, canonical, net.id)).catch(() => null);
  const links = [ds?.website && { label: "Website", href: ds.website }, ds?.twitter && { label: "X", href: ds.twitter }, ds?.telegram && { label: "Telegram", href: ds.telegram }, ds?.discord && { label: "Discord", href: ds.discord }].filter((l): l is { label: string; href: string } => Boolean(l));
  const similar = (await getHomeData(net.id).catch(() => null))?.organic.filter((p) => p.baseToken.address.toLowerCase() !== canonical.toLowerCase()).slice(0, 8) ?? [];

  // A listed (published) project can be voted on. Unlisted tokens have no listing row, so no vote button.
  let listing: { id: string; votes: number } | null = null;
  if (supabaseConfigured()) {
    try {
      const db = supabaseAdmin();
      const { data: l } = await db.from("token_submissions").select("id").eq("network_id", net.id).eq("address", canonical).eq("status", "published").maybeSingle();
      if (l) {
        const { count } = await db.from("community_votes").select("*", { count: "exact", head: true }).eq("submission_id", l.id);
        listing = { id: l.id, votes: count ?? 0 };
      }
    } catch {
      listing = null;
    }
  }

  const stats: Array<[string, string]> = [
    ["Market cap", usdCompact(info?.marketCapUsd ?? top?.marketCapUsd)],
    ["FDV", usdCompact(info?.fdvUsd ?? top?.fdvUsd)],
    ["Liquidity", usdCompact(info?.liquidityUsd ?? top?.liquidityUsd)],
    ["24h volume", usdCompact(info?.volume24hUsd ?? top?.volumeUsd.h24)],
    ["24h txns", top?.txns24h ? (top.txns24h.buys + top.txns24h.sells).toLocaleString("en-US") : "—"],
    ["Pool age", ageShort(top?.createdAt)],
  ];

  const ld = { "@context": "https://schema.org", "@type": "FinancialProduct", name: identity?.name ?? "Token", alternateName: identity?.symbol ?? undefined, description: `${identity?.name ?? "Token"} on ${net.name}: live price, liquidity, pools and risk signals.`, category: "Cryptocurrency", url: `/token/${net.id}/${canonical}` };
  return (
    <div className="space-y-4">
      <StickyPriceBar symbol={identity?.symbol ?? "?"} name={identity?.name ?? "Token"} logo={identity?.imageUrl ?? null} networkId={net.id} address={canonical} price={priceUsd(price)} change={top?.change.h24 ?? null} />
      <ViewTracker network={net.id} address={canonical} symbol={identity?.symbol ?? "?"} name={identity?.name ?? "Token"} logo={identity?.imageUrl ?? null} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <header className="card space-y-3 p-4 md:p-5">
        <div className="flex items-center gap-3 md:gap-4">
          <TokenLogo src={identity?.imageUrl} symbol={identity?.symbol ?? "?"} size={48} networkId={networkId} address={address} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-xl font-bold leading-tight md:text-2xl">{identity?.name || "Unnamed token"}{isBoosted && <span className="badge badge-sponsored ml-2 align-middle"><Zap size={11} aria-hidden="true" /> Boosted</span>}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-semibold text-soft">{identity?.symbol}</span>
              <span className="rounded-full border border-line px-2 py-0.5 font-semibold text-soft">{net.name}</span>
            </p>
          </div>
          <div className="num shrink-0 text-right">
            <div className="text-xl font-bold md:text-2xl">{priceUsd(price)}</div>
            <div className="text-sm">
              <Change v={top?.change.h24 ?? null} /> <span className="text-xs text-muted">24h</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="num rounded-full border border-line px-3 py-1.5 md:hidden">{shortAddress(canonical)}</span>
          <span className="num hidden break-all md:inline">{canonical}</span>
          {trade[0] && (
            <a href={trade[0].url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-primary btn-sm">
              Trade on {trade[0].label.replace("View pool on ", "")} <ArrowUpRight size={13} />
            </a>
          )}
          <CopyButton value={canonical} label="Copy" />
          <WatchButton network={net.id} address={canonical} />
          <span className="inline-flex items-center rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] text-xs font-semibold"><QuickAlert network={net.id} address={canonical} symbol={identity?.symbol ?? "?"} name={identity?.name ?? "Token"} price={price} compact /><span className="pr-3">Alert</span></span>
          <ShareButton title={`${identity?.name ?? "Token"} on Crypto Gems`} />
          <Link href={`/compare?a=${net.id}:${encodeURIComponent(canonical)}`} className="btn btn-sm">
            <NavIcon name="compare" size={16} /> Compare
          </Link>
          {explorer && (
            <a href={explorer} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
              Explorer <ExternalLink size={12} />
            </a>
          )}
        </div>
      </header>

      {top && (
        <section className="grid grid-cols-2 gap-2 md:grid-cols-5" aria-label="Price change">
          {([["5m", top.change.m5], ["1h", top.change.h1], ["6h", top.change.h6], ["24h", top.change.h24]] as const).map(([k, v]) => (
            <div key={k} className={`card-flat flex items-center justify-between px-3.5 py-2.5 ${v === null ? "" : v >= 0 ? "!border-[color-mix(in_srgb,var(--up)_30%,transparent)]" : "!border-[color-mix(in_srgb,var(--down)_30%,transparent)]"}`}>
              <span className="text-xs font-semibold text-muted">{k}</span><Change v={v} />
            </div>
          ))}
          {top.txns24h && top.txns24h.buys + top.txns24h.sells > 0 && (
            <div className="card-flat col-span-2 px-3.5 py-2.5 md:col-span-1" title="Buys versus sells in the last 24 hours">
              <div className="mb-1.5 flex justify-between text-[11px] font-semibold"><span className="text-up">{top.txns24h.buys.toLocaleString("en-US")} buys</span><span className="text-down">{top.txns24h.sells.toLocaleString("en-US")} sells</span></div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--down)]"><div className="fx-fill bg-[var(--up)]" style={{ width: `${(top.txns24h.buys / (top.txns24h.buys + top.txns24h.sells)) * 100}%` }} /></div>
            </div>
          )}
        </section>
      )}

      {top ? <PriceChart networkId={net.id} pool={top.address} /> : <div className="card p-6 text-sm text-soft">No trading pool with chart data exists for this token yet.</div>}

      <section className="grid grid-cols-2 gap-2 md:grid-cols-6" aria-label="Market statistics">
        {stats.map(([k, v]) => (
          <div key={k} className="card-flat p-3.5">
            <div className="text-xs text-muted">{k}</div>
            <div className="num mt-1 text-lg font-bold">{v}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="card p-4 md:p-5" aria-label="Pools">
            <h2 className="mb-3 font-display text-lg font-bold">Pools ({sorted.length})</h2>
            {sorted.length === 0 ? (
              <p className="text-sm text-muted">No pools found.</p>
            ) : (
              <div className="grid gap-2">
                {sorted.slice(0, 10).map((p, i) => {
                  const share = (p.liquidityUsd ?? 0) / Math.max(1, sorted[0]?.liquidityUsd ?? 1);
                  return (
                    <div key={p.id} className="card-flat row-in relative overflow-hidden px-3.5 py-2.5 text-sm" style={{ ["--i" as string]: i }}>
                      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]" style={{ width: `${Math.max(2, share * 100)}%` }} />
                      <div className="relative flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{p.name}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                            <span className="badge capitalize">{p.dex?.replace(/-/g, " ") ?? "unknown DEX"}</span> {ageShort(p.createdAt)} old
                          </span>
                        </span>
                        <span className="num text-right text-xs text-soft">
                          <span className="block">{usdCompact(p.liquidityUsd)} liquidity</span>
                          <span className="block">{usdCompact(p.volumeUsd.h24)} 24h volume</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card p-4 md:p-5" aria-label="Market risk signals">
            <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
              <ShieldAlert size={18} /> Market risk signals
            </h2>
            <p className="mb-3 text-xs text-muted">Derived from pool data only. This is not an audit and cannot see contract code, ownership, or liquidity locks.</p>
            {risks.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-soft">
                <Info size={15} /> No market-data warnings. Always verify the contract yourself.
              </p>
            ) : (
              <ul className="grid gap-2">
                {risks.map((r) => (
                  <li key={r.code} className="card-flat flex gap-3 p-3 text-sm">
                    <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${r.level === "high" ? "bg-down" : r.level === "medium" ? "bg-warm" : "bg-brand"}`} role="img" aria-label={`${r.level} risk`} />
                    {r.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <RiskPanel networkId={net.id} address={canonical} market={risks.map((r) => r.level).filter((l): l is "high" | "medium" | "info" => l !== "low")} />
          {similar.length > 0 && (
            <section className="card p-4 md:p-5" aria-label="Similar tokens">
              <h2 className="h3 mb-3">More on {net.name}</h2>
              <div className="scroll-x">
                {similar.map((p, i) => (
                  <Link key={p.id} href={`/token/${p.networkId}/${p.baseToken.address}`} className="card-flat hover-lift row-in flex w-[190px] shrink-0 items-center gap-2.5 p-3" style={{ ["--i" as string]: i }}>
                    <TokenLogo src={p.baseToken.imageUrl} symbol={p.baseToken.symbol} size={34} networkId={p.networkId} address={p.baseToken.address} />
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.baseToken.symbol}</span><Change v={p.change.h24} /></span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="order-first space-y-4 lg:order-none">
          <BuyPanel networkId={net.id} address={canonical} symbol={identity?.symbol ?? "token"} decimals={identity?.decimals ?? null} poolPriceUsd={price} solUsd={solUsd} links={trade} explorerBase={net.explorer ?? null} />
          {links.length > 0 && (
            <section className="card p-4" aria-label="Project links">
              <h2 className="h3 mb-3">Links</h2>
              <div className="flex flex-wrap gap-2">
                {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-sm">{l.label} <ExternalLink size={12} aria-hidden="true" /></a>)}
              </div>
              <p className="mt-2 text-[11px] text-muted">Links come from DexScreener token profiles and are supplied by the project. Verify before connecting a wallet.</p>
            </section>
          )}
          <div className="card flex items-center justify-between gap-2 p-3"><span className="text-xs text-muted">Contract</span><CopyButton value={canonical} label="Copy contract" /></div>
          {listing && <section className="card p-4" aria-label="Community vote"><h2 className="mb-2 font-display text-lg font-bold">Community favourite</h2><VoteButton submissionId={listing.id} initialVotes={listing.votes} /></section>}
          <Link href={`/copilot?network=${net.id}&address=${encodeURIComponent(canonical)}`} className="btn w-full"><Bot size={16} /> Ask the Copilot about this token</Link>
          <AvailableSlot placement="token-page" variant="card" />
        </aside>
      </div>
    </div>
  );
}
