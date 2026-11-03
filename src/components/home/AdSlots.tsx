import { ArrowUpRight, Megaphone } from "lucide-react";
import Link from "next/link";
import type { PlacementId } from "@/lib/ads/catalog";
import { getPlacement } from "@/lib/ads/catalog";
import type { ActiveCampaign } from "@/lib/ads/delivery";
import { AdBeacon } from "./AdBeacon";

/** Honest empty inventory: invites a purchase and never pretends an advertiser exists. */
export function AvailableSlot({ placement, variant = "wide" }: { placement: PlacementId; variant?: "hero" | "wide" | "card" }) {
  const p = getPlacement(placement);
  if (!p) return null;
  const from = Math.min(...Object.values(p.prices).filter((v): v is number => v !== undefined));
  const height = variant === "hero" ? "min-h-[132px] md:min-h-[260px]" : variant === "wide" ? "min-h-[84px] md:min-h-[110px]" : "min-h-[180px]";
  return (
    <Link href={`/promotion/book?placement=${placement}`} className={`glass hover-lift group relative flex ${height} flex-col justify-between gap-2 overflow-hidden p-4 md:p-7`}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--aurora-a),transparent_70%)]" />
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Megaphone size={12} /> Available placement
      </span>
      <div className="relative">
        <h3 className={`font-display font-bold leading-tight md:text-3xl ${variant === "hero" ? "text-xl" : "text-lg"}`}>{variant === "hero" ? "Put your project in front of the market" : `Promote here`}</h3>
        <p className={`mt-1.5 max-w-xl text-sm text-soft ${variant === "card" ? "" : "hidden md:block"}`}>
          {p.name}: {p.blurb}
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
          Reserve from ${from.toLocaleString("en-US")} <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** A paid campaign. Always carries a Sponsored label and a sponsored rel. Uses the mobile creative when one exists. */
export function CampaignSlot({ campaign, variant = "wide" }: { campaign: ActiveCampaign; variant?: "hero" | "wide" | "card" }) {
  const height = variant === "hero" ? "h-[168px] md:h-[260px]" : variant === "wide" ? "h-[84px] md:h-[110px]" : "h-[180px]";
  return (
    <AdBeacon campaignId={campaign.id}>
      <a href={`/api/ads/click?c=${campaign.id}`} rel="sponsored noopener noreferrer" target="_blank" className={`glass hover-lift relative block ${height} overflow-hidden`}>
        <picture>
          {campaign.creativeMobile && <source media="(max-width: 767px)" srcSet={campaign.creativeMobile} />}
          { }
          <img src={campaign.creativeDesktop} alt={campaign.headline ?? campaign.projectName} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        </picture>
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">Sponsored</span>
      </a>
    </AdBeacon>
  );
}
