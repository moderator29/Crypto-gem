import { ArrowUpRight, Megaphone } from "lucide-react";
import Link from "next/link";
import { ChainBadge } from "@/components/ui/ChainBadge";
import type { ActiveCampaign } from "@/lib/ads/delivery";
import type { BannerProfile } from "@/lib/market-data/providers/dexscreener";
import { AdBeacon } from "./AdBeacon";

const CARD = "relative block h-[104px] w-[312px] shrink-0 overflow-hidden rounded-2xl border border-[var(--line-1)] bg-[var(--surface-2)] md:h-[120px] md:w-[360px]";

function SponsoredCard({ c }: { c: ActiveCampaign }) {
  return (
    <AdBeacon campaignId={c.id}>
      <a href={`/api/ads/click?c=${c.id}`} rel="sponsored noopener noreferrer" target="_blank" className={`${CARD} hover-lift`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.creativeDesktop} alt={c.headline ?? c.projectName} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">Sponsored</span>
      </a>
    </AdBeacon>
  );
}

function ProfileCard({ b }: { b: BannerProfile }) {
  return (
    <Link href={`/token/${b.networkId}/${b.address}`} className={`${CARD} hover-lift group`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.header} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden="true" />
      <span className="absolute left-2.5 top-2.5 rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 backdrop-blur">Demo · trending on DexScreener</span>
      <span className="absolute inset-x-3 bottom-2.5 flex items-center gap-2 text-white">
        <ChainBadge networkId={b.networkId} size={18} />
        <span className="truncate text-sm font-bold">{b.name}</span>
        <span className="text-xs text-white/75">{b.symbol}</span>
        <ArrowUpRight size={15} className="ml-auto shrink-0 opacity-80 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

function EmptySlot({ n, from }: { n: number; from: number }) {
  return (
    <Link href="/promotion/book?placement=featured" className="group relative flex min-h-[104px] flex-1 items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--surface-1)] p-4 transition hover:border-[var(--brand)] hover:bg-[var(--surface-2)] md:min-h-[120px]">
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,var(--aurora-a),transparent_68%)]" />
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand)_14%,transparent)] text-brand transition group-hover:scale-105"><Megaphone size={20} /></span>
      <span className="relative min-w-0">
        <span className="eyebrow block">Slot {n} · available</span>
        <span className="mt-1 block truncate font-semibold">Your banner here</span>
        <span className="block text-xs text-muted">From ${from.toLocaleString("en-US")} per day</span>
      </span>
    </Link>
  );
}

/**
 * Top of Discover: a self-scrolling strip of banners, then two empty slots anyone can book.
 * Real paid campaigns come first and carry the Sponsored label. Demo cards are labelled and come from
 * DexScreener's own trending profiles, so nobody is shown as an advertiser who is not one.
 */
export function BannerStrip({ campaigns, demos, from }: { campaigns: ActiveCampaign[]; demos: BannerProfile[]; from: number }) {
  const cards = [
    ...campaigns.map((c) => <SponsoredCard key={c.id} c={c} />),
    ...demos.map((b) => <ProfileCard key={b.address} b={b} />),
  ];
  const loop = cards.length > 0 && cards.length < 4 ? [...cards, ...cards] : cards;
  return (
    <section aria-label="Featured banners" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted"><span className="live-dot" aria-hidden="true" /> Featured banners</h2>
        <Link href="/promotion" className="btn btn-sm"><Megaphone size={14} aria-hidden="true" /> Banner promotion</Link>
      </div>
      {cards.length > 0 && (
        <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
          <div className="marquee gap-3" style={{ ["--marquee-dur" as string]: `${Math.max(loop.length, 4) * 9}s` }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 gap-3 pr-3" aria-hidden={copy === 1 ? true : undefined}>
                {loop.map((c, i) => <div key={i} className="shrink-0">{c}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        <EmptySlot n={1} from={from} />
        <EmptySlot n={2} from={from} />
      </div>
    </section>
  );
}
