"use client";

import { Coins, ExternalLink, ListChecks, LogIn, Megaphone, Rocket, Star, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { CountUp } from "@/components/fx/CountUp";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Kit";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { useToast } from "@/components/ui/Toast";
import { accessToken } from "@/lib/auth/client";
import { getNetwork } from "@/lib/market-data/networks";
import { ageShort, priceUsd, usdCompact } from "@/lib/utils/format";
import { buildActivity } from "./activity";
import { DashEmpty } from "./DashEmpty";
import { useDashboard } from "./DashboardProvider";

const STATUS: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", pending_review: "In review", approved: "Approved", awaiting_payment: "Awaiting payment", payment_confirmed: "Paid", published: "Published", rejected: "Rejected", expired: "Expired", refunded: "Refunded", cancelled: "Cancelled", suspended: "Suspended",
  pending: "Pending", paid: "Paid", active: "Active", scheduled: "Scheduled", paused: "Paused", completed: "Completed", pending_creative: "Creative in review",
};
const TONE = (s: string) => (["published", "active", "paid", "approved", "completed"].includes(s) ? "up" : ["rejected", "suspended", "cancelled", "refunded", "expired"].includes(s) ? "down" : "warn") as "up" | "down" | "warn";
const Status = ({ s }: { s: string }) => <Badge tone={TONE(s)}>{STATUS[s] ?? s}</Badge>;
const fmt = (iso: string | null) => (iso ? `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC` : "—");

/** Handles loading, signed-out, unavailable and error once, for every dashboard page. */
export function Gate({ children }: { children: React.ReactNode }) {
  const { state, refresh } = useDashboard();
  if (state === "loading") {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your dashboard">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[106px]" />)}</div>
        <div className="skeleton h-14" />
        <div className="skeleton h-14" />
        <div className="skeleton h-14" />
      </div>
    );
  }
  if (state === "unavailable") return <EmptyState title="Dashboard is not available yet" description="Sign-in or the database is not connected for this site, so there is nothing to show." />;
  if (state === "signin") return <EmptyState icon={LogIn} title="Sign in to see your dashboard" description="Your listings, boosts, campaigns, payments and watchlist live here." action={<ButtonLink href="/login?next=/dashboard" variant="primary">Sign in</ButtonLink>} />;
  if (state === "error") return <EmptyState tone="error" title="Could not load your dashboard" description="Something went wrong on our side. Your data is safe." action={<Button size="sm" onClick={() => void refresh()}>Try again</Button>} />;
  return <>{children}</>;
}

export function OverviewView() {
  const { data } = useDashboard();
  if (!data) return null;
  const n = {
    listings: data.submissions.filter((s) => s.status === "published").length,
    review: data.submissions.filter((s) => ["pending_review", "submitted", "approved"].includes(s.status)).length,
    boosts: data.boosts.filter((b) => b.status === "active").length,
    campaigns: data.campaigns.filter((c) => c.status === "active").length,
    pending: data.orders.filter((o) => o.status === "pending").length,
    spend: data.orders.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.price_usd), 0),
  };
  const activity = buildActivity(data);
  const todo = [
    ...data.orders.filter((o) => o.status === "pending").map((o) => ({ key: o.id, text: `Finish payment for your ${o.kind.replace("_", " ")} order ($${Number(o.price_usd).toLocaleString("en-US")})`, href: `/pay/${o.id}`, cta: "Pay" })),
    ...data.submissions.filter((s) => s.status === "rejected").map((s) => ({ key: s.id, text: `${s.name} was rejected${s.rejection_reason ? `: ${s.rejection_reason}` : ""}`, href: "/dashboard/listings", cta: "Review" })),
  ];
  return (
    <div className="space-y-6">
      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Published listings" icon={<ListChecks size={16} aria-hidden="true" />} value={<CountUp value={n.listings} />} />
        <Stat label="In review" icon={<ListChecks size={16} aria-hidden="true" />} value={<CountUp value={n.review} />} />
        <Stat label="Active boosts" icon={<Rocket size={16} aria-hidden="true" />} value={<CountUp value={n.boosts} />} />
        <Stat label="Active campaigns" icon={<Megaphone size={16} aria-hidden="true" />} value={<CountUp value={n.campaigns} />} />
        <Stat label="Pending payments" icon={<Wallet size={16} aria-hidden="true" />} value={<CountUp value={n.pending} />} />
        <Stat label="Total paid" icon={<Coins size={16} aria-hidden="true" />} value={<CountUp value={n.spend} kind="usd" />} />
      </div>
      {todo.length > 0 && (
        <section aria-label="Needs your attention" className="card card-lit p-5">
          <h2 className="h3 mb-3">Needs your attention</h2>
          <ul className="divide-y divide-[var(--line-1)]">
            {todo.map((t) => <li key={t.key} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0 text-soft">{t.text}</span><ButtonLink href={t.href} size="sm" variant="primary">{t.cta}</ButtonLink></li>)}
          </ul>
        </section>
      )}
      {activity.length > 0 ? (
        <section aria-label="Recent activity" className="card p-5">
          <h2 className="h3 mb-4">Recent activity</h2>
          <ol className="timeline stagger space-y-4">
            {activity.map((e) => (
              <li key={e.key}>
                <Link href={e.href} className="group flex items-center gap-3 rounded-lg">
                  <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--line-2)] bg-[var(--surface-2)] text-brand transition-colors group-hover:border-[var(--brand)]"><e.icon size={14} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1 text-sm text-soft group-hover:text-text">{e.text}</span>
                  <span className="num shrink-0 text-xs text-muted">{ageShort(e.at) === "—" ? "" : `${ageShort(e.at)} ago`}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <DashEmpty icon={Rocket} title="Nothing here yet" description="Your listings, orders, boosts and campaigns will show up as a timeline once you start." />
      )}
      <section aria-label="Next actions" className="grid gap-3 sm:grid-cols-3">
        <ButtonLink href="/add-coin">List a project</ButtonLink>
        <ButtonLink href="/boost"><Rocket size={15} /> Boost a project</ButtonLink>
        <ButtonLink href="/promotion">Book advertising</ButtonLink>
      </section>
    </div>
  );
}

export function ListingsView() {
  const { data } = useDashboard();
  if (!data) return null;
  if (data.submissions.length === 0) return <DashEmpty icon={ListChecks} title="No listings yet" description="Paste a contract address and we detect the rest." action={<ButtonLink href="/add-coin" variant="primary">List your token</ButtonLink>} />;
  const payable = data.orders.find((o) => o.kind === "listing" && o.status === "pending");
  return (
    <ul className="stagger grid gap-3">
      {data.submissions.map((s) => (
        <li key={s.id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="flex items-center gap-2"><span className="truncate font-semibold">{s.name}</span><span className="text-muted">{s.symbol}</span>{s.network_id && <ChainBadge networkId={s.network_id} size={18} />}</span>
              <span className="mt-0.5 block text-xs text-muted">{getNetwork(s.network_id ?? "")?.name ?? "No network"} · submitted {ageShort(s.created_at)} ago</span>
            </span>
            <Status s={s.status} />
          </div>
          {s.status === "rejected" && s.rejection_reason && <p className="mt-3 rounded-lg bg-[color-mix(in_srgb,var(--down)_10%,transparent)] p-3 text-sm text-down">Reason: {s.rejection_reason}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {s.status === "published" && s.network_id && s.address && <ButtonLink href={`/token/${s.network_id}/${s.address}`} size="sm">View page <ExternalLink size={13} /></ButtonLink>}
            {s.status === "published" && <ButtonLink href={`/boost/${s.id}`} size="sm"><Rocket size={13} /> Boost</ButtonLink>}
            {s.status === "awaiting_payment" && payable && <ButtonLink href={`/pay/${payable.id}`} size="sm" variant="primary">Finish payment</ButtonLink>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BoostsView() {
  const { data } = useDashboard();
  if (!data) return null;
  if (data.boosts.length === 0) return <DashEmpty icon={Rocket} title="No boosts yet" description="Boost a listed project for clearly labelled sponsored visibility." action={<ButtonLink href="/boost" variant="primary">Choose a pack</ButtonLink>} />;
  return (
    <ul className="stagger grid gap-3">
      {data.boosts.map((b) => (
        <li key={b.id} className="card flex items-center justify-between gap-3 p-4">
          <span className="min-w-0"><span className="block truncate font-semibold">{b.projectName ?? "Project"} <span className="font-normal capitalize text-muted">· {b.pack_id}</span></span><span className="num mt-0.5 block text-xs text-muted">{fmt(b.starts_at)} to {fmt(b.ends_at)}</span></span>
          <Status s={b.status} />
        </li>
      ))}
    </ul>
  );
}

export function CampaignsView() {
  const { data } = useDashboard();
  if (!data) return null;
  if (data.campaigns.length === 0) return <DashEmpty icon={Megaphone} title="No campaigns yet" description="Reserve a placement, preview it in place, and track measured results here." action={<ButtonLink href="/promotion" variant="primary">View placements</ButtonLink>} />;
  return (
    <ul className="stagger grid gap-3">
      {data.campaigns.map((c) => {
        const ctr = c.impressions > 0 ? `${((c.clicks / c.impressions) * 100).toFixed(2)}%` : "—";
        return (
          <li key={c.id} className="card space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0"><span className="block truncate font-semibold">{c.headline ?? c.placement_id}</span><span className="num mt-0.5 block text-xs text-muted">{c.placement_id} · {fmt(c.starts_at)} to {fmt(c.ends_at)}</span></span>
              <Status s={c.status} />
            </div>
            <dl className="num grid grid-cols-3 gap-2">
              {([["Impressions", c.impressions.toLocaleString("en-US")], ["Clicks", c.clicks.toLocaleString("en-US")], ["CTR", ctr]] as const).map(([k, v]) => <div key={k} className="card-flat p-3"><dt className="eyebrow">{k}</dt><dd className="mt-2 text-lg font-bold">{v}</dd></div>)}
            </dl>
            <p className="text-[11px] text-muted">Impressions count a visitor once per hour after the ad was visible for a second. Bots are excluded.</p>
          </li>
        );
      })}
    </ul>
  );
}

export function PaymentsView() {
  const { data } = useDashboard();
  if (!data) return null;
  if (data.orders.length === 0) return <DashEmpty icon={Wallet} title="No orders yet" description="Listings, boosts and campaigns you buy will appear here with their payment status." />;
  return (
    <ul className="stagger grid gap-3">
      {data.orders.map((o) => (
        <li key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <span><span className="block font-semibold capitalize">{o.kind.replace("_", " ")} <span className="num font-normal text-soft">· ${Number(o.price_usd).toLocaleString("en-US")}</span></span><span className="num mt-0.5 block text-xs text-muted">{fmt(o.created_at)}</span></span>
          <span className="flex items-center gap-3"><Status s={o.status} />{o.status === "pending" && <ButtonLink href={`/pay/${o.id}`} size="sm" variant="primary">Pay</ButtonLink>}</span>
        </li>
      ))}
    </ul>
  );
}

export function WatchlistView() {
  const { watch, refresh } = useDashboard();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (watch.length === 0) return <DashEmpty icon={Star} title="Your watchlist is empty" description="Use the Watch button on any token page to follow it here." action={<ButtonLink href="/markets" variant="primary">Browse markets</ButtonLink>} />;
  const remove = async (network: string, address: string) => {
    const key = `${network}:${address}`;
    setBusy(key);
    try {
      const jwt = await accessToken();
      const res = await fetch(`/api/watchlist?network=${network}&address=${encodeURIComponent(address)}`, { method: "DELETE", headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} });
      if (!res.ok) throw new Error("failed");
      toast.success("Removed from watchlist");
      await refresh();
    } catch {
      toast.error("Could not remove it", "Try again in a moment.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <ul className="stagger grid gap-2">
      {watch.map((i) => (
        <li key={`${i.network}:${i.address}`} className="card flex items-center gap-3 p-3">
          <Link href={`/token/${i.network}/${i.address}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-90">
            <TokenLogo src={i.live?.imageUrl} symbol={i.live?.symbol ?? "?"} size={42} />
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate font-semibold">{i.live?.name ?? "Token"}</span><ChainBadge networkId={i.network} size={16} /></span><span className="block truncate text-xs text-muted">{i.live?.symbol} · {getNetwork(i.network)?.name ?? i.network}</span></span>
            <span className="num text-right text-sm"><span className="block font-semibold">{priceUsd(i.live?.priceUsd)}</span><span className="block text-xs text-muted">{usdCompact(i.live?.liquidityUsd)} liq</span></span>
          </Link>
          <Button icon size="sm" variant="ghost" aria-label={`Remove ${i.live?.symbol ?? "token"} from watchlist`} loading={busy === `${i.network}:${i.address}`} onClick={() => void remove(i.network, i.address)}><Trash2 size={15} /></Button>
        </li>
      ))}
    </ul>
  );
}
