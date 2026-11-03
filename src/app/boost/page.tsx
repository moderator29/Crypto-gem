import type { Metadata } from "next";
import { BoostProjects } from "@/components/boost/BoostProjects";
import { BOOST_PACKS } from "@/lib/ads/catalog";

export const metadata: Metadata = { title: "Boost" };

export default function BoostPage() {
  return (
    <div className="space-y-6">
      <header className="card p-6 md:p-10">
        <h1 className="font-display text-3xl font-bold md:text-5xl">Boost your project to the top</h1>
        <p className="mt-3 max-w-2xl text-soft">
          Give your listed project more visibility across Crypto Gems. Select a token, choose your Boost Pack and activate your campaign.
        </p>
      </header>

      <BoostProjects />

      <section aria-label="Boost packs" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {BOOST_PACKS.map((b) => (
          <article key={b.id} className="card flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold">{b.name}</h3>
              {b.label && <span className="chip !min-h-6 !px-2 text-[10px]">{b.label}</span>}
            </div>
            <div className="num font-display text-3xl font-bold">${b.priceUsd}</div>
            <div className="num text-sm text-soft">{b.credits} credits</div>
            <div className="text-sm text-muted">{b.hours >= 24 ? `${b.hours / 24} day${b.hours > 24 ? "s" : ""}` : `${b.hours} hours`}</div>
          </article>
        ))}
      </section>
      <p className="text-xs text-muted">
        Boost buys sponsored visibility, clearly labelled, and never changes organic rank. Credits are an exposure entitlement, not a ranking guarantee. Pack contents and prices are configurable by administrators.
      </p>
    </div>
  );
}
