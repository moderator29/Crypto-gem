import { Info, Layers } from "lucide-react";
import type { Metadata } from "next";
import { discount, PLACEMENTS } from "@/lib/ads/catalog";

export const metadata: Metadata = { title: "Promotion" };

const DAYS = [1, 3, 7] as const;

export default async function PromotionPage({ searchParams }: { searchParams: Promise<{ placement?: string }> }) {
  const { placement } = await searchParams;
  return (
    <div className="space-y-6">
      <header className="glass p-6 md:p-10">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-5xl">Put your project in front of the market.</h1>
        <p className="mt-3 max-w-2xl text-soft">
          Reach active crypto traders through premium placements across Crypto Gems. Choose your audience, select your placement, launch your campaign and track its performance.
        </p>
        <p className="mt-4 flex items-start gap-2 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" /> Every paid placement is labelled Sponsored and never affects organic rankings. Statistics shown to advertisers are measured, never estimated.
        </p>
      </header>

      <section aria-label="Placements" className="grid gap-4 md:grid-cols-2">
        {PLACEMENTS.map((p) => (
          <article key={p.id} id={p.id} className={`glass space-y-4 p-5 ${placement === p.id ? "!border-[var(--brand)]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">{p.name}</h2>
                <p className="mt-1 text-sm text-soft">{p.blurb}</p>
              </div>
              <span className="chip !cursor-default shrink-0 text-xs">
                <Layers size={12} /> {p.exclusive ? "Exclusive" : "Shared"}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs text-muted">
              <div>
                <dt>Where</dt>
                <dd className="font-semibold text-text">{p.where}</dd>
              </div>
              <div>
                <dt>Slots</dt>
                <dd className="font-semibold text-text">{p.slots}</dd>
              </div>
              <div>
                <dt>Desktop creative</dt>
                <dd className="num font-semibold text-text">
                  {p.desktop.w}×{p.desktop.h}
                </dd>
              </div>
              <div>
                <dt>Mobile creative</dt>
                <dd className="num font-semibold text-text">
                  {p.mobile.w}×{p.mobile.h}
                </dd>
              </div>
            </dl>
            <div className="grid grid-cols-3 gap-2">
              {DAYS.map((d) => {
                const dc = discount(p, d);
                const price = p.prices[d];
                return (
                  <div key={d} className="glass-flat p-3 text-center">
                    <div className="text-xs text-muted">
                      {d} day{d > 1 ? "s" : ""}
                    </div>
                    <div className="num text-lg font-bold">{price !== undefined ? `$${price.toLocaleString("en-US")}` : "—"}</div>
                    {dc && dc.pct > 0 && <div className="num text-[11px] text-up">save {dc.pct}%</div>}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <section className="glass p-5 text-sm text-soft" aria-label="Campaign checkout status">
        <h2 className="mb-1 font-display text-lg font-bold text-text">Campaign checkout</h2>
        Online booking opens once payments and the campaign database are connected. Prices above are the current default price book and are managed from the admin dashboard, not hardcoded in campaigns. Until checkout is live, nothing here can be purchased and no inventory is shown as sold.
      </section>
    </div>
  );
}
