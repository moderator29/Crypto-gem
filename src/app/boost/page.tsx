import { Check, Clock, ShieldCheck, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BoostProjects } from "@/components/boost/BoostProjects";
import { NavIcon } from "@/components/ui/NavIcon";
import { BOOST_PACKS } from "@/lib/ads/catalog";

export const metadata: Metadata = { title: "Boost", description: "Sponsored visibility for listed projects. Packs from $100, paid in crypto, live after verified payment." };

const STEPS = [
  { n: "01", title: "Pick your coin", text: "Search the projects already listed on Crypto Gems." },
  { n: "02", title: "Choose a pack", text: "Six packs from $100. Longer packs rotate with higher priority." },
  { n: "03", title: "Pay in crypto", text: "USDT or USDC through NOWPayments. Live after verified payment." },
] as const;

const duration = (h: number) => (h >= 48 ? `${h / 24} days` : h === 24 ? "1 day" : `${h} hours`);

export default function BoostPage() {
  return (
    <div className="space-y-8 md:space-y-12">
      <header className="card card-lit relative overflow-hidden p-6 md:p-10">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--brand)_16%,transparent)]"><NavIcon name="boost" size={28} /></span>
        <p className="eyebrow mt-5">Trending promotion</p>
        <h1 className="h-display mt-3 max-w-[18ch]">Boost your project to the top</h1>
        <p className="mt-4 max-w-2xl text-soft md:text-lg">Select a listed coin, choose a Boost pack and pay with USDT or USDC. Your boost starts automatically after payment is verified.</p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-soft">
          <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-up" aria-hidden="true" /> Clearly labelled as sponsored</li>
          <li className="flex items-center gap-2"><Clock size={16} className="text-up" aria-hidden="true" /> From 12 hours to 7 days</li>
          <li className="flex items-center gap-2"><Zap size={16} className="text-up" aria-hidden="true" /> Starts after verified payment</li>
        </ul>
      </header>

      <ol aria-label="How it works" className="stagger grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="card flex gap-4 p-4 md:p-5">
            <span className="num text-3xl font-bold text-brand">{s.n}</span>
            <span><span className="block font-semibold">{s.title}</span><span className="block text-sm text-soft">{s.text}</span></span>
          </li>
        ))}
      </ol>

      <BoostProjects />

      <section aria-label="Boost packs" className="reveal space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div><p className="eyebrow">Packs</p><h2 className="h2 mt-2">Six packs, one clear price each</h2></div>
        </div>
        <div className="stagger grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {BOOST_PACKS.map((b) => (
            <article key={b.id} className="boost-pack flex flex-col gap-3 rounded-2xl border border-[var(--line-1)] p-4" style={{ ["--tier" as string]: b.priority }}>
              <div className="flex items-start justify-between">
                <span className="flex items-baseline gap-2"><Zap size={16} className="self-center text-warm" aria-hidden="true" /><span className="num text-4xl font-bold leading-none">{b.credits.toLocaleString("en-US")}</span><span className="eyebrow !text-muted">Boost</span></span>
                {b.label && <span className="badge badge-brand">{b.label}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-soft"><Clock size={14} aria-hidden="true" /> {duration(b.hours)}</div>
              <ul className="flex-1 space-y-1.5 text-[13px] text-soft">{b.allocations.map((a) => <li key={a} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-up" aria-hidden="true" /> {a}</li>)}</ul>
              <div className="num text-3xl font-bold">${b.priceUsd.toLocaleString("en-US")}</div>
            </article>
          ))}
        </div>
        <p className="text-xs text-muted">Boost buys sponsored visibility, clearly labelled, and never changes organic rank. Boost points describe the size of a pack, not a ranking guarantee. Packs and prices are managed by administrators. Need a banner instead? <Link href="/promotion" className="font-semibold text-brand">See banner promotion</Link>.</p>
      </section>
    </div>
  );
}
