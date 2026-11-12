import { Check, Info, Layers, MousePointerClick, ShieldCheck, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlacementPreview } from "@/components/promotion/PlacementPreview";
import { ExpressRail } from "@/components/boost/ExpressRail";
import { ContactCard } from "@/components/ui/ContactCard";
import { NavIcon } from "@/components/ui/NavIcon";
import { discount, PLACEMENTS } from "@/lib/ads/catalog";

export const metadata: Metadata = { title: "Banner promotion", description: "Banner placements on Crypto Gems with measured impressions and clicks, paid in crypto." };

const DAYS = [1, 3, 7] as const;
const STEPS = [
  { icon: MousePointerClick, title: "Pick a placement", text: "Choose where your banner appears and for how long." },
  { icon: Layers, title: "Preview your creative", text: "See it in place before paying, then send it to an admin on Telegram." },
  { icon: ShieldCheck, title: "Pay in crypto", text: "Verified on the network. Goes live once the creative is approved." },
] as const;

export default async function PromotionPage({ searchParams }: { searchParams: Promise<{ placement?: string }> }) {
  const { placement } = await searchParams;
  return (
    <div className="space-y-8 md:space-y-12">
      <ExpressRail />
      <header className="card card-lit relative overflow-hidden p-6 md:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line-2)] px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-brand"><NavIcon name="promo" size={16} /> Banner promotion</span>
        <h1 className="h-display mt-5 max-w-[20ch]">Put your project in front of active traders</h1>
        <p className="mt-4 max-w-2xl text-soft md:text-lg">Choose a banner placement and a campaign length, then send your creative to an admin on Telegram. Your banner goes live after payment is confirmed and the creative is approved.</p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-soft">
          <li className="flex items-center gap-2"><Check size={15} className="text-up" aria-hidden="true" /> Measured impressions and clicks</li>
          <li className="flex items-center gap-2"><Check size={15} className="text-up" aria-hidden="true" /> Longer campaigns cost less per day</li>
          <li className="flex items-center gap-2"><Check size={15} className="text-up" aria-hidden="true" /> Never affects organic rank</li>
        </ul>
        <Link href="/promotion/book?placement=hero" className="btn btn-primary btn-lg mt-6 w-full sm:w-auto">Book a banner</Link>
      </header>

      <ContactCard note="Banner listings, custom campaigns or bundles with a boost? Message an admin on Telegram and we will set it up with you." />

      <ol aria-label="How it works" className="stagger grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card flex gap-4 p-4 md:p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-brand"><s.icon size={21} aria-hidden="true" /></span>
            <span><span className="eyebrow block">Step {i + 1}</span><span className="mt-1 block font-semibold">{s.title}</span><span className="block text-sm text-soft">{s.text}</span></span>
          </li>
        ))}
      </ol>

      <section aria-label="Placements" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        {PLACEMENTS.map((p) => (
          <article key={p.id} id={p.id} className={`reveal card space-y-4 p-4 md:p-5 ${placement === p.id ? "!border-[var(--brand)]" : ""}`}>
            <PlacementPreview placement={p.id} device="desktop" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="h3">{p.name}</h2>
                <p className="num mt-0.5 text-sm text-muted">Recommended {p.desktop.w} × {p.desktop.h}px</p>
              </div>
              <span className="badge shrink-0"><Layers size={12} aria-hidden="true" /> {p.exclusive ? "Exclusive" : `Shared · ${p.slots} slots`}</span>
            </div>
            <p className="text-sm text-soft">{p.blurb}</p>
            <ul className="space-y-2 text-[15px]">
              {DAYS.map((d) => {
                const dc = discount(p, d);
                const price = p.prices[d];
                if (price === undefined) return null;
                return (
                  <li key={d} className="flex items-center gap-2.5">
                    <Check size={16} className="shrink-0 text-up" aria-hidden="true" />
                    <span className="font-semibold">{d} {d === 1 ? "day" : "days"}</span>
                    <span className="num">${price.toLocaleString("en-US")}</span>
                    {dc && dc.pct > 0 && <span className="badge badge-up">-{dc.pct}%</span>}
                  </li>
                );
              })}
            </ul>
            <dl className="grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs text-muted">
              <div><dt>Where</dt><dd className="font-semibold text-text">{p.where}</dd></div>
              <div><dt>Mobile creative</dt><dd className="num font-semibold text-text">{p.mobile.w} × {p.mobile.h}px</dd></div>
            </dl>
            <Link href={`/promotion/book?placement=${p.id}`} className="btn btn-primary w-full">Book {p.name}</Link>
          </article>
        ))}
      </section>

      <section className="reveal card grid gap-5 p-5 md:grid-cols-3 md:p-6" aria-label="Measurement and rules">
        <div><h2 className="h3 flex items-center gap-2"><Timer size={18} aria-hidden="true" /> What we measure</h2><p className="mt-2 text-sm text-soft">An impression counts when the banner is visible for at least a second, once per visitor per hour, bots excluded. Clicks are counted on our server before the redirect.</p></div>
        <div><h2 className="h3 flex items-center gap-2"><ShieldCheck size={18} aria-hidden="true" /> Always labelled</h2><p className="mt-2 text-sm text-soft">Every paid banner carries a Sponsored label. Paid placement never changes organic ranking or the order of any list.</p></div>
        <div><h2 className="h3 flex items-center gap-2"><Info size={18} aria-hidden="true" /> Creative review</h2><p className="mt-2 text-sm text-soft">Creatives are reviewed before they go live. If one is rejected you can send a replacement, and the campaign window is kept.</p></div>
      </section>
    </div>
  );
}
