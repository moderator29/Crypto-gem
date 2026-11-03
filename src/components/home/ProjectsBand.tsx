import { ArrowRight, Megaphone, PlusCircle, Rocket } from "lucide-react";
import Link from "next/link";
import { BOOST_PACKS, LISTING_PACKAGES, PLACEMENTS } from "@/lib/ads/catalog";

const minAd = Math.min(...PLACEMENTS.flatMap((p) => Object.values(p.prices).filter((v): v is number => typeof v === "number")));

/** The three ways a project works with Crypto Gems, each leading to its own page. */
export function ProjectsBand() {
  const items = [
    { href: "/add-coin", icon: PlusCircle, eyebrow: "List", title: "Get listed", text: "Paste your contract and we detect the chain, logo and market data. Review, pay, and track your application.", meta: `From $${LISTING_PACKAGES[0]?.priceUsd}`, cta: "Start a listing" },
    { href: "/boost", icon: Rocket, eyebrow: "Boost", title: "Boost a listed project", text: "Sponsored visibility in discovery lists, clearly labelled. Activates after payment is verified.", meta: `From $${Math.min(...BOOST_PACKS.map((b) => b.priceUsd))}`, cta: "Choose a pack" },
    { href: "/promotion", icon: Megaphone, eyebrow: "Advertise", title: "Reach active traders", text: "Reserve homepage, trending and token page placements with a live preview and measured results.", meta: `From $${minAd}`, cta: "View placements" },
  ];
  return (
    <div className="stagger grid gap-3 md:grid-cols-3">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className="card hover-lift group flex flex-col gap-4 p-5">
          <span className="flex items-center justify-between">
            <span className="icon-tile h-10 w-10 rounded-xl"><it.icon size={19} aria-hidden="true" /></span>
            <span className="badge">{it.meta}</span>
          </span>
          <span>
            <span className="eyebrow">{it.eyebrow}</span>
            <span className="h3 mt-2 block">{it.title}</span>
            <span className="mt-1.5 block text-sm text-soft">{it.text}</span>
          </span>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand">{it.cta} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" aria-hidden="true" /></span>
        </Link>
      ))}
    </div>
  );
}
