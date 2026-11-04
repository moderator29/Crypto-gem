"use client";

import { Coins, ExternalLink, LayoutGrid, List, ListChecks, LogIn, Megaphone, RefreshCw, Rocket, Search, Star, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { CountUp } from "@/components/fx/CountUp";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Kit";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { useToast } from "@/components/ui/Toast";
import { accessToken } from "@/lib/auth/client";
import { useAccountFetch } from "@/lib/useAccountFetch";
import { getNetwork } from "@/lib/market-data/networks";
import { ageShort, priceUsd, usdCompact } from "@/lib/utils/format";
import { buildActivity } from "./activity";
import { BoostCard } from "./BoostCard";
import { DashEmpty } from "./DashEmpty";
import { useDashboard } from "./DashboardProvider";
import { ExportButton } from "./ExportButton";
import { ListingJourney } from "./ListingJourney";
import { boostPhase, nextSteps } from "./logic";
import { NextSteps } from "./NextSteps";
import { useNow } from "./useNow";

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

/** Overview: quick stats, setup checklist, attention items and the activity timeline. */
export function OverviewView() {
  const { data, watch, refresh } = useDashboard();
  const alertsRes = useAccountFetch<{ alerts: unknown[] }>("/api/alerts");
  const [spin, setSpin] = useState(false);
  if (!data) return null;
  const alertCount = alertsRes.state === "ok" ? alertsRes.data.alerts.length : null;
  const reload = async () => {
    setSpin(true);
    await refresh();
    alertsRes.reload();
    setTimeout(() => setSpin(false), 600);
  };
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
      <div className="flex items-center justify-between gap-3">
        <div className="scroll-x" aria-label="Quick stats">
          {([["Watching", String(watch.length), "/dashboard/watchlist"], ["Price alerts", alertCount === null ? "—" : String(alertCount), "/alerts"], ["Orders", String(data.orders.length), "/dashboard/payments"]] as const).map(([k, v, href]) => (
            <Link key={k} href={href} className="chip"><span className="num font-bold text-text">{v}</span> {k}</Link>
          ))}
        </div>
        <button type="button" className="btn btn-icon btn-sm shrink-0" aria-label="Refresh dashboard" onClick={() => void reload()}><RefreshCw size={15} className={spin ? "animate-spin" : ""} /></button>
      </div>
      <NextSteps steps={nextSteps(data, watch, alertCount)} />
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

const LISTING_GROUPS = {
  all: { label: "All", match: () => true },
  live: { label: "Live", match: (s: string) => s === "published" },
  progress: { label: "In progress", match: (s: string) => ["awaiting_payment", "submitted", "pending_review", "payment_confirmed", "approved"].includes(s) },
  attention: { label: "Needs attention", match: (s: string) => ["draft", "rejected", "suspended", "cancelled", "refunded", "expired"].includes(s) },
} as const;

/** Listings with a status filter and an animated journey timeline per listing. */
export function ListingsView() {
  const { data } = useDashboard();
  const [group, setGroup] = useState<keyof typeof LISTING_GROUPS>("all");
  if (!data) return null;
  if (data.submissions.length === 0) return <DashEmpty icon={ListChecks} title="No listings yet" description="Paste a contract address and we detect the rest." action={<ButtonLink href="/add-coin" variant="primary">List your token</ButtonLink>} />;
  const payable = data.orders.find((o) => o.kind === "listing" && o.status === "pending");
  const shown = data.submissions.filter((s) => LISTING_GROUPS[group].match(s.status));
  return (
    <div className="space-y-4">
      <div className="scroll-x" role="group" aria-label="Filter listings">
        {(Object.keys(LISTING_GROUPS) as Array<keyof typeof LISTING_GROUPS>).map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={group === k} onClick={() => setGroup(k)}>{LISTING_GROUPS[k].label} <span className="num text-muted">{data.submissions.filter((s) => LISTING_GROUPS[k].match(s.status)).length}</span></button>
        ))}
      </div>
      {shown.length === 0 && <p className="card-flat p-4 text-sm text-muted" role="status">No listings in this group.</p>}
      <ul className="stagger grid gap-3">
        {shown.map((s) => (
          <li key={s.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="flex items-center gap-2"><span className="truncate font-semibold">{s.name}</span><span className="text-muted">{s.symbol}</span>{s.network_id && <ChainBadge networkId={s.network_id} size={18} />}</span>
                <span className="mt-0.5 block text-xs text-muted">{getNetwork(s.network_id ?? "")?.name ?? "No network"} · submitted {ageShort(s.created_at)} ago</span>
              </span>
              <Status s={s.status} />
            </div>
            <ListingJourney status={s.status} reason={s.rejection_reason} />
            <div className="mt-3 flex flex-wrap gap-2">
              {s.status === "published" && s.network_id && s.address && <ButtonLink href={`/token/${s.network_id}/${s.address}`} size="sm">View page <ExternalLink size={13} /></ButtonLink>}
              {s.status === "published" && <ButtonLink href={`/boost/${s.id}`} size="sm"><Rocket size={13} /> Boost</ButtonLink>}
              {s.status === "awaiting_payment" && payable && <ButtonLink href={`/pay/${payable.id}`} size="sm" variant="primary">Finish payment</ButtonLink>}
              {s.address && <CopyButton value={s.address} label="Copy contract" what="Contract address copied" />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Boosts grouped as running (with a countdown ring), queued and ended. */
export function BoostsView() {
  const { data } = useDashboard();
  const boosts = data?.boosts ?? [];
  const live = boosts.some((b) => b.status === "active");
  const now = useNow(live);
  if (!data) return null;
  if (boosts.length === 0) return <DashEmpty icon={Rocket} title="No boosts yet" description="Boost a listed project for clearly labelled sponsored visibility." action={<ButtonLink href="/boost" variant="primary">Choose a pack</ButtonLink>} />;
  const sections = ([["running", "Running now"], ["queued", "Queued"], ["ended", "Ended"]] as const).map(([phase, title]) => ({ phase, title, items: boosts.filter((b) => boostPhase(b, now ?? 0) === phase) })).filter((g) => g.items.length > 0);
  return (
    <div className="space-y-6">
      {sections.map((g) => (
        <section key={g.phase} aria-label={g.title} className="space-y-3">
          <h2 className="eyebrow">{g.title} <span className="num">({g.items.length})</span></h2>
          <ul className="stagger grid gap-3">{g.items.map((b) => <BoostCard key={`${b.id}-${g.phase}`} boost={b} now={now} phase={g.phase} />)}</ul>
        </section>
      ))}
    </div>
  );
}

export function CampaignsView() {
  const { data } = useDashboard();
  if (!data) return null;
  if (data.campaigns.length === 0) return <DashEmpty icon={Megaphone} title="No campaigns yet" description="Reserve a placement, preview it in place, and track measured results here." action={<ButtonLink href="/promotion" variant="primary">View placements</ButtonLink>} />;
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportButton name="campaigns" headers={["Campaign", "Placement", "Status", "Starts (UTC)", "Ends (UTC)", "Impressions", "Clicks", "CTR %"]} rows={data.campaigns.map((c) => [c.headline ?? "", c.placement_id, c.status, c.starts_at, c.ends_at, c.impressions, c.clicks, c.impressions > 0 ? Number(((c.clicks / c.impressions) * 100).toFixed(2)) : null])} />
      </div>
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
    </div>
  );
}

/** Orders with a status filter, a paid total and CSV export. */
export function PaymentsView() {
  const { data } = useDashboard();
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  if (!data) return null;
  if (data.orders.length === 0) return <DashEmpty icon={Wallet} title="No orders yet" description="Listings, boosts and campaigns you buy will appear here with their payment status." />;
  const shown = data.orders.filter((o) => filter === "all" || o.status === filter);
  const paidTotal = data.orders.filter((o) => o.status === "paid").reduce((t, o) => t + Number(o.price_usd), 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="scroll-x" role="group" aria-label="Filter orders">
          {(["all", "pending", "paid"] as const).map((k) => <button key={k} type="button" className="chip capitalize" aria-pressed={filter === k} onClick={() => setFilter(k)}>{k} <span className="num text-muted">{k === "all" ? data.orders.length : data.orders.filter((o) => o.status === k).length}</span></button>)}
        </div>
        <ExportButton name="orders" headers={["Order ID", "Type", "Amount (USD)", "Status", "Created (UTC)", "Paid (UTC)"]} rows={shown.map((o) => [o.id, o.kind.replace("_", " "), Number(o.price_usd), o.status, o.created_at, o.paid_at])} />
      </div>
      <p className="text-sm text-soft">Total paid <span className="num font-semibold text-text">${paidTotal.toLocaleString("en-US")}</span></p>
      {shown.length === 0 && <p className="card-flat p-4 text-sm text-muted" role="status">No orders with this status.</p>}
      <ul className="stagger grid gap-3">
        {shown.map((o) => (
          <li key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <span><span className="block font-semibold capitalize">{o.kind.replace("_", " ")} <span className="num font-normal text-soft">· ${Number(o.price_usd).toLocaleString("en-US")}</span></span><span className="num mt-0.5 block text-xs text-muted">{fmt(o.created_at)}</span></span>
            <span className="flex items-center gap-3"><Status s={o.status} />{o.status === "pending" && <ButtonLink href={`/pay/${o.id}`} size="sm" variant="primary">Pay</ButtonLink>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const VIEW_KEY = "cg:watch-view";
const readView = (): "list" | "grid" => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
};

/** Watchlist as a list or card grid (remembered), with a quick filter, CSV export and remove. */
export function WatchlistView() {
  const { watch, refresh } = useDashboard();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "grid">(readView);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && t && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? watch.filter((i) => `${i.live?.name ?? ""} ${i.live?.symbol ?? ""} ${getNetwork(i.network)?.name ?? i.network}`.toLowerCase().includes(needle)) : watch;
  }, [watch, q]);
  if (watch.length === 0) return <DashEmpty icon={Star} title="Your watchlist is empty" description="Use the Watch button on any token page to follow it here." action={<ButtonLink href="/markets" variant="primary">Browse markets</ButtonLink>} />;
  const choose = (v: "list" | "grid") => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode: the choice applies for this visit only */
    }
  };
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
  const removeBtn = (i: (typeof watch)[number]) => (
    <Button icon size="sm" variant="ghost" aria-label={`Remove ${i.live?.symbol ?? "token"} from watchlist`} loading={busy === `${i.network}:${i.address}`} onClick={() => void remove(i.network, i.address)}><Trash2 size={15} /></Button>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-48">
          <span className="sr-only">Filter watchlist</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input ref={searchRef} className="input !pl-9" placeholder="Filter by name, symbol or network (press /)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { setQ(""); e.currentTarget.blur(); } }} />
        </label>
        <div className="seg" role="group" aria-label="Layout">
          <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => choose("list")}><List size={16} /></button>
          <button type="button" aria-pressed={view === "grid"} aria-label="Card grid view" onClick={() => choose("grid")}><LayoutGrid size={16} /></button>
        </div>
        <ExportButton name="watchlist" headers={["Name", "Symbol", "Network", "Address", "Price (USD)", "Liquidity (USD)"]} rows={shown.map((i) => [i.live?.name ?? "", i.live?.symbol ?? "", getNetwork(i.network)?.name ?? i.network, i.address, i.live?.priceUsd ?? null, i.live?.liquidityUsd ?? null])} />
      </div>
      {shown.length === 0 && <p className="card-flat p-4 text-sm text-muted" role="status">Nothing matches that filter.</p>}
      {view === "list" ? (
        <ul className="stagger grid gap-2">
          {shown.map((i) => (
            <li key={`${i.network}:${i.address}`} className="card flex items-center gap-3 p-3">
              <Link href={`/token/${i.network}/${i.address}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-90">
                <TokenLogo src={i.live?.imageUrl} symbol={i.live?.symbol ?? "?"} size={42} />
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate font-semibold">{i.live?.name ?? "Token"}</span><ChainBadge networkId={i.network} size={16} /></span><span className="block truncate text-xs text-muted">{i.live?.symbol} · {getNetwork(i.network)?.name ?? i.network}</span></span>
                <span className="num text-right text-sm"><span className="block font-semibold">{priceUsd(i.live?.priceUsd)}</span><span className="block text-xs text-muted">{usdCompact(i.live?.liquidityUsd)} liq</span></span>
              </Link>
              {removeBtn(i)}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="watch-grid stagger">
          {shown.map((i) => (
            <li key={`${i.network}:${i.address}`} className="card hover-lift relative flex min-w-0 flex-col items-center gap-2 p-4 text-center">
              <span className="absolute right-1 top-1">{removeBtn(i)}</span>
              <Link href={`/token/${i.network}/${i.address}`} className="flex min-w-0 max-w-full flex-col items-center gap-2 rounded-lg">
                <TokenLogo src={i.live?.imageUrl} symbol={i.live?.symbol ?? "?"} size={52} />
                <span className="max-w-full truncate font-semibold">{i.live?.symbol ?? "Token"}</span>
                <span className="flex max-w-full items-center gap-1.5 text-xs text-muted"><ChainBadge networkId={i.network} size={14} /><span className="truncate">{getNetwork(i.network)?.name ?? i.network}</span></span>
                <span className="num text-sm font-bold">{priceUsd(i.live?.priceUsd)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
