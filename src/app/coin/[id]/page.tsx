import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountUp } from "@/components/fx/CountUp";
import { StaticSpark } from "@/components/markets/StaticSpark";
import { CopyButton } from "@/components/ui/CopyButton";
import { Stat } from "@/components/ui/Kit";
import { ShareButton } from "@/components/ui/ShareButton";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { TokenVote } from "@/components/votes/TokenVote";
import { NETWORKS } from "@/lib/market-data/networks";
import { coingecko } from "@/lib/market-data/providers/coingecko";
import { priceUsd, usdCompact } from "@/lib/utils/format";

export const revalidate = 120;

type Params = { id: string };
const validId = (id: string) => /^[a-z0-9-]{1,80}$/.test(id);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} price, market cap and links` };
}

function Range({ low, high, price }: { low: number | null; high: number | null; price: number | null }) {
  if (low === null || high === null || price === null || high <= low) return null;
  const pos = Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted"><span className="num">{priceUsd(low)}</span><span>24h range</span><span className="num">{priceUsd(high)}</span></div>
      <div className="relative h-2 rounded-full bg-[var(--surface-3)]"><span className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded bg-[var(--brand)] shadow-[0_0_10px_var(--neon-glow)]" style={{ left: `calc(${pos}% - 3px)` }} /></div>
    </div>
  );
}

export default async function CoinPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!validId(id)) notFound();
  let coin: Awaited<ReturnType<typeof coingecko.coin>>;
  try {
    coin = await coingecko.coin(id);
  } catch {
    return <div className="card mx-auto mt-10 max-w-lg p-6" role="alert"><h1 className="h3">Coin data is temporarily unavailable</h1><p className="mt-2 text-sm text-soft">CoinGecko is not responding. Reload in a minute.</p></div>;
  }
  if (!coin) notFound();
  const chains = NETWORKS.filter((n) => n.coingecko && coin.platforms[n.coingecko]);
  const links = [coin.website && { label: "Website", href: coin.website }, coin.twitter && { label: "X", href: coin.twitter }, coin.telegram && { label: "Telegram", href: coin.telegram }, coin.github && { label: "GitHub", href: coin.github }].filter((l): l is { label: string; href: string } => Boolean(l));
  const up = (coin.change24h ?? 0) >= 0;
  return (
    <div className="space-y-4">
      <header className="card space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-3 md:gap-4">
          <TokenLogo src={coin.image} symbol={coin.symbol} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-xl font-bold leading-tight md:text-2xl">{coin.name}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted"><span className="font-semibold text-soft">{coin.symbol}</span>{coin.rank && <span className="badge">Rank #{coin.rank}</span>}{coin.categories.slice(0, 2).map((c) => <span key={c} className="badge">{c}</span>)}</p>
          </div>
          <TokenVote network="cg" address={coin.id} />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="num"><div className="text-3xl font-bold">{priceUsd(coin.priceUsd)}</div><div className={`text-sm font-semibold ${up ? "text-up" : "text-down"}`}>{coin.change24h === null ? "—" : `${up ? "+" : ""}${coin.change24h.toFixed(2)}%`} <span className="text-xs font-normal text-muted">24h</span></div></div>
          <StaticSpark points={coin.spark} width={220} height={56} />
        </div>
        <Range low={coin.low24h} high={coin.high24h} price={coin.priceUsd} />
        <div className="flex flex-wrap gap-2">
          <ShareButton title={`${coin.name} on CryptoGemCN`} />
          {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-sm">{l.label} <ExternalLink size={12} aria-hidden="true" /></a>)}
          <a href={`https://www.coingecko.com/en/coins/${coin.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm">CoinGecko <ExternalLink size={12} aria-hidden="true" /></a>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Market statistics">
        <Stat label="Market cap" value={<CountUp value={coin.marketCapUsd ?? 0} kind="usd" />} />
        <Stat label="24h volume" value={<CountUp value={coin.volume24hUsd ?? 0} kind="usd" />} />
        <Stat label="FDV" value={coin.fdvUsd ? <CountUp value={coin.fdvUsd} kind="usd" /> : "—"} />
        <Stat label="Circulating" value={coin.circulating ? <CountUp value={coin.circulating} /> : "—"} note={coin.maxSupply ? `Max ${usdCompact(coin.maxSupply).replace("$", "")}` : undefined} />
        <Stat label="7d" value={coin.change7d === null ? "—" : `${coin.change7d >= 0 ? "+" : ""}${coin.change7d.toFixed(2)}%`} />
        <Stat label="30d" value={coin.change30d === null ? "—" : `${coin.change30d >= 0 ? "+" : ""}${coin.change30d.toFixed(2)}%`} />
        <Stat label="All-time high" value={priceUsd(coin.ath)} />
        <Stat label="All-time low" value={priceUsd(coin.atl)} />
      </section>

      {chains.length > 0 && (
        <section className="card p-4 md:p-5" aria-label="Contracts">
          <h2 className="h3 mb-3">Contracts</h2>
          <ul className="divide-y divide-[var(--line-1)]">
            {chains.map((n) => {
              const addr = coin.platforms[n.coingecko as string] as string;
              return (
                <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="font-semibold">{n.name}</span>
                  <span className="flex items-center gap-2"><span className="num max-w-[180px] truncate text-xs text-muted">{addr}</span><CopyButton value={addr} label="Copy" /><Link href={`/token/${n.id}/${addr}`} className="btn btn-sm btn-primary">Open pool page</Link></span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {coin.description && (
        <section className="card p-4 md:p-5" aria-label="About">
          <h2 className="h3 mb-2">About {coin.name}</h2>
          <p className="line-clamp-6 text-sm text-soft">{coin.description.replace(/<[^>]+>/g, "")}</p>
          <p className="mt-2 text-[11px] text-muted">Source CoinGecko. Not financial advice.</p>
        </section>
      )}
    </div>
  );
}
