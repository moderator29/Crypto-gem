import { Rocket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BOOST_PACKS } from "@/lib/ads/catalog";

export const metadata: Metadata = { title: "Boost" };

export default function BoostPage() {
  const dbReady = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  return (
    <div className="space-y-6">
      <header className="glass p-6 md:p-10">
        <h1 className="font-display text-3xl font-bold md:text-5xl">Boost your project to the top</h1>
        <p className="mt-3 max-w-2xl text-soft">
          Give your listed project more visibility across Crypto Gems. Select a token, choose your Boost Pack and activate your campaign.
        </p>
      </header>

      <section aria-label="Eligible projects" className="glass p-6">
        <h2 className="font-display text-lg font-bold">Select a listed project</h2>
        {dbReady ? (
          <p className="mt-2 text-sm text-soft">No listed projects yet. Boost is available to projects already listed on Crypto Gems.</p>
        ) : (
          <p className="mt-2 text-sm text-soft">
            Listed projects load from the Crypto Gems database, which is not connected in this environment. Only listed projects can be boosted, so none are shown rather than inventing examples.
          </p>
        )}
        <Link href="/add-coin" className="btn btn-primary mt-4 inline-flex">
          <Rocket size={16} /> List your token first
        </Link>
      </section>

      <section aria-label="Boost packs" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {BOOST_PACKS.map((b) => (
          <article key={b.id} className="glass flex flex-col gap-2 p-4">
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
