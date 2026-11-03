import { ArrowUpRight, Bot, ExternalLink, ShieldAlert, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailableSlot } from "@/components/home/AdSlots";
import { Change } from "@/components/home/TokenRow";
import { PriceChart } from "@/components/token/PriceChart";
import { WatchButton } from "@/components/dashboard/WatchButton";
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
          <div className="glass mx-auto mt-10 max-w-lg p-6" role="alert">
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
  const trade = tradeLinks(net.id, canonical, top?.address);
  const explorer = explorerTokenUrl(net.id, canonical);

  const stats: Array<[string, string]> = [
    ["Market cap", usdCompact(info?.marketCapUsd ?? top?.marketCapUsd)],
    ["FDV", usdCompact(info?.fdvUsd ?? top?.fdvUsd)],
    ["Liquidity", usdCompact(info?.liquidityUsd ?? top?.liquidityUsd)],
    ["24h volume", usdCompact(info?.volume24hUsd ?? top?.volumeUsd.h24)],
    ["24h txns", top?.txns24h ? (top.txns24h.buys + top.txns24h.sells).toLocaleString("en-US") : "—"],
    ["Pool age", ageShort(top?.createdAt)],
  ];

  return (
    <div className="space-y-4">
      <header className="glass space-y-3 p-4 md:p-5">
        <div className="flex items-center gap-3 md:gap-4">
          <TokenLogo src={identity?.imageUrl} symbol={identity?.symbol ?? "?"} size={48} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-xl font-bold leading-tight md:text-2xl">{identity?.name || "Unnamed token"}</h1>
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
          <CopyButton value={canonical} label="Copy" />
          <WatchButton network={net.id} address={canonical} />
          {explorer && (
            <a href={explorer} target="_blank" rel="noopener noreferrer" className="btn !min-h-9 !px-3 text-xs">
              Explorer <ExternalLink size={12} />
            </a>
          )}
        </div>
      </header>

      {top ? <PriceChart networkId={net.id} pool={top.address} /> : <div className="glass p-6 text-sm text-soft">No trading pool with chart data exists for this token yet.</div>}

      <section className="grid grid-cols-2 gap-2 md:grid-cols-6" aria-label="Market statistics">
        {stats.map(([k, v]) => (
          <div key={k} className="glass-flat p-3.5">
            <div className="text-xs text-muted">{k}</div>
            <div className="num mt-1 text-lg font-bold">{v}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="glass p-4 md:p-5" aria-label="Pools">
            <h2 className="mb-3 font-display text-lg font-bold">Pools ({sorted.length})</h2>
            {sorted.length === 0 ? (
              <p className="text-sm text-muted">No pools found.</p>
            ) : (
              <div className="grid gap-2">
                {sorted.slice(0, 10).map((p) => (
                  <div key={p.id} className="glass-flat flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted">
                        {p.dex?.replace(/-/g, " ") ?? "unknown DEX"} · {ageShort(p.createdAt)} old
                      </span>
                    </span>
                    <span className="num text-right text-xs text-soft">
                      <span className="block">{usdCompact(p.liquidityUsd)} liquidity</span>
                      <span className="block">{usdCompact(p.volumeUsd.h24)} 24h volume</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="glass p-4 md:p-5" aria-label="Market risk signals">
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
                  <li key={r.code} className="glass-flat flex gap-3 p-3 text-sm">
                    <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${r.level === "high" ? "bg-down" : r.level === "medium" ? "bg-warm" : "bg-brand"}`} aria-label={`${r.level} risk`} />
                    {r.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="glass p-4" aria-label="Trade">
            <h2 className="font-display text-lg font-bold">Trade</h2>
            <p className="mb-3 mt-1 text-xs text-muted">Crypto Gems does not execute trades. You will leave this site and trade with your own wallet.</p>
            {trade.length === 0 ? (
              <p className="text-sm text-muted">No verified trading venue is available for this network yet.</p>
            ) : (
              <div className="grid gap-2">
                {trade.map((t, i) => (
                  <a key={t.url} href={t.url} target="_blank" rel="noopener noreferrer nofollow" className={`btn ${i === 0 ? "btn-primary" : ""}`}>
                    {t.label} <ArrowUpRight size={15} />
                  </a>
                ))}
              </div>
            )}
            <div className="mt-3">
              <CopyButton value={canonical} label="Copy contract" />
            </div>
          </section>
          <Link href={`/copilot?network=${net.id}&address=${encodeURIComponent(canonical)}`} className="btn w-full"><Bot size={16} /> Ask the Copilot about this token</Link>
          <AvailableSlot placement="token-page" variant="card" />
        </aside>
      </div>
    </div>
  );
}
