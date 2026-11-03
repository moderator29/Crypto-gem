"use client";

import { ExternalLink, Rocket, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork } from "@/lib/market-data/networks";
import { accessToken, authConfigured } from "@/lib/auth/client";
import { ageShort, priceUsd, usdCompact } from "@/lib/utils/format";

interface Overview {
  email: string | null;
  submissions: Array<{ id: string; name: string; symbol: string; network_id: string | null; address: string | null; status: string; rejection_reason: string | null; created_at: string }>;
  orders: Array<{ id: string; kind: string; price_usd: number; status: string; created_at: string; paid_at: string | null }>;
  boosts: Array<{ id: string; projectName: string | null; pack_id: string; status: string; starts_at: string | null; ends_at: string | null }>;
  campaigns: Array<{ id: string; placement_id: string; headline: string | null; status: string; starts_at: string; ends_at: string; impressions: number; clicks: number }>;
}
interface Watch { items: Array<{ network: string; address: string; live: { priceUsd: number | null; name: string | null; symbol: string | null; imageUrl: string | null; liquidityUsd: number | null } | null }> }

const TABS = ["Overview", "Listings", "Boosts", "Campaigns", "Payments", "Watchlist"] as const;
type Tab = (typeof TABS)[number];

const STATUS: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", pending_review: "In review", approved: "Approved", awaiting_payment: "Awaiting payment", payment_confirmed: "Paid", published: "Published", rejected: "Rejected", expired: "Expired", refunded: "Refunded", cancelled: "Cancelled", suspended: "Suspended",
  pending: "Pending", paid: "Paid", active: "Active", scheduled: "Scheduled", paused: "Paused", completed: "Completed", pending_creative: "Creative in review",
};
const tone = (s: string) => (["published", "active", "paid", "approved"].includes(s) ? "text-up" : ["rejected", "suspended", "cancelled", "refunded"].includes(s) ? "text-down" : "text-warm");
const Status = ({ s }: { s: string }) => <span className={`text-xs font-semibold ${tone(s)}`}>{STATUS[s] ?? s}</span>;
const Empty = ({ text, href, cta }: { text: string; href?: string; cta?: string }) => (
  <div className="glass-flat space-y-3 p-5 text-sm text-soft">
    <p>{text}</p>
    {href && <Link href={href} className="btn btn-primary inline-flex">{cta}</Link>}
  </div>
);
const fmt = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—");

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [state, setState] = useState<"loading" | "ok" | "signin" | "unavailable" | "error">("loading");
  const [data, setData] = useState<Overview | null>(null);
  const [watch, setWatch] = useState<Watch | null>(null);

  const load = useCallback(async () => {
    if (!authConfigured()) return setState("unavailable");
    const jwt = await accessToken();
    if (!jwt) return setState("signin");
    const h = { Authorization: `Bearer ${jwt}` };
    const [o, w] = await Promise.all([fetch("/api/me/overview", { headers: h }), fetch("/api/watchlist", { headers: h })]);
    if (o.status === 401) return setState("signin");
    if (!o.ok) return setState(o.status === 503 ? "unavailable" : "error");
    setData((await o.json()) as Overview);
    if (w.ok) setWatch((await w.json()) as Watch);
    setState("ok");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (state === "loading") return <div className="space-y-3" aria-busy="true"><div className="skeleton h-24" /><div className="skeleton h-48" /></div>;
  if (state === "unavailable") return <div className="glass p-6 text-sm text-soft">Sign-in is not configured in this environment (Privy app id missing), so there is no dashboard data to show.</div>;
  if (state === "signin") return <div className="glass space-y-3 p-6"><p>Sign in to manage your listings, boosts and campaigns.</p><Link className="btn btn-primary inline-flex" href="/login?next=/dashboard">Sign in</Link></div>;
  if (state === "error" || !data) return <div className="glass p-6 text-down" role="alert">Could not load your dashboard. Try again shortly.</div>;

  const live = {
    listings: data.submissions.filter((s) => s.status === "published").length,
    review: data.submissions.filter((s) => ["pending_review", "submitted", "approved"].includes(s.status)).length,
    boosts: data.boosts.filter((b) => b.status === "active").length,
    campaigns: data.campaigns.filter((c) => c.status === "active").length,
    pending: data.orders.filter((o) => o.status === "pending").length,
    spend: data.orders.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.price_usd), 0),
  };

  return (
    <div className="space-y-5">
      <div className="scroll-x" role="tablist" aria-label="Dashboard sections">
        {TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className="chip" onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === "Overview" && (
        <>
          <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {([["Published listings", live.listings], ["In review", live.review], ["Active boosts", live.boosts], ["Active campaigns", live.campaigns], ["Pending payments", live.pending], ["Total paid", `$${live.spend.toLocaleString("en-US")}`]] as const).map(([k, v]) => (
              <div key={k} className="glass-flat p-4"><dt className="text-xs text-muted">{k}</dt><dd className="num mt-1 font-display text-2xl font-bold">{v}</dd></div>
            ))}
          </dl>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/add-coin" className="btn">List a project</Link>
            <Link href="/boost" className="btn"><Rocket size={15} /> Boost a project</Link>
            <Link href="/promotion" className="btn">Book advertising</Link>
          </div>
        </>
      )}

      {tab === "Listings" && (data.submissions.length === 0 ? <Empty text="You have not submitted a project yet." href="/add-coin" cta="List your token" /> : (
        <ul className="grid gap-2">{data.submissions.map((s) => (
          <li key={s.id} className="glass-flat p-4">
            <div className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="block truncate font-semibold">{s.name} <span className="text-muted">{s.symbol}</span></span><span className="block truncate text-xs text-muted">{getNetwork(s.network_id ?? "")?.name ?? "No network"} · submitted {ageShort(s.created_at)} ago</span></span><Status s={s.status} /></div>
            {s.status === "rejected" && s.rejection_reason && <p className="mt-2 text-sm text-down">Reason: {s.rejection_reason}</p>}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {s.status === "published" && s.network_id && s.address && <Link className="btn !min-h-9 !px-3 text-xs" href={`/token/${s.network_id}/${s.address}`}>View <ExternalLink size={12} /></Link>}
              {s.status === "published" && <Link className="btn !min-h-9 !px-3 text-xs" href={`/boost/${s.id}`}><Rocket size={12} /> Boost</Link>}
              {s.status === "awaiting_payment" && (() => { const o = data.orders.find((x) => x.kind === "listing" && x.status === "pending"); return o ? <Link className="btn btn-primary !min-h-9 !px-3 text-xs" href={`/pay/${o.id}`}>Finish payment</Link> : null; })()}
            </div>
          </li>))}</ul>))}

      {tab === "Boosts" && (data.boosts.length === 0 ? <Empty text="No boosts yet. Boost a listed project for sponsored visibility." href="/boost" cta="Boost a project" /> : (
        <ul className="grid gap-2">{data.boosts.map((b) => (
          <li key={b.id} className="glass-flat flex items-center justify-between gap-3 p-4"><span className="min-w-0"><span className="block truncate font-semibold">{b.projectName ?? "Project"} · {b.pack_id}</span><span className="num block text-xs text-muted">{fmt(b.starts_at)} to {fmt(b.ends_at)}</span></span><Status s={b.status} /></li>))}</ul>))}

      {tab === "Campaigns" && (data.campaigns.length === 0 ? <Empty text="No advertising campaigns yet." href="/promotion" cta="Book advertising" /> : (
        <ul className="grid gap-2">{data.campaigns.map((c) => {
          const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) + "%" : "—";
          return (
            <li key={c.id} className="glass-flat space-y-2 p-4">
              <div className="flex items-center justify-between gap-3"><span className="min-w-0"><span className="block truncate font-semibold">{c.headline ?? c.placement_id}</span><span className="num block text-xs text-muted">{c.placement_id} · {fmt(c.starts_at)} to {fmt(c.ends_at)}</span></span><Status s={c.status} /></div>
              <dl className="num grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-muted">Impressions</dt><dd className="font-semibold">{c.impressions.toLocaleString("en-US")}</dd></div><div><dt className="text-xs text-muted">Clicks</dt><dd className="font-semibold">{c.clicks.toLocaleString("en-US")}</dd></div><div><dt className="text-xs text-muted">CTR</dt><dd className="font-semibold">{ctr}</dd></div></dl>
              <p className="text-[11px] text-muted">Impressions count a visitor once per hour after the ad was visible for a second. Bots excluded.</p>
            </li>);
        })}</ul>))}

      {tab === "Payments" && (data.orders.length === 0 ? <Empty text="No orders yet." /> : (
        <ul className="grid gap-2">{data.orders.map((o) => (
          <li key={o.id} className="glass-flat flex items-center justify-between gap-3 p-4"><span><span className="block font-semibold capitalize">{o.kind.replace("_", " ")} · <span className="num">${Number(o.price_usd).toLocaleString("en-US")}</span></span><span className="num block text-xs text-muted">{fmt(o.created_at)}</span></span><span className="flex items-center gap-3"><Status s={o.status} />{o.status === "pending" && <Link className="btn btn-primary !min-h-9 !px-3 text-xs" href={`/pay/${o.id}`}>Pay</Link>}</span></li>))}</ul>))}

      {tab === "Watchlist" && (!watch || watch.items.length === 0 ? <Empty text="Your watchlist is empty. Use the Watch button on any token page." href="/" cta="Discover tokens" /> : (
        <ul className="grid gap-2">{watch.items.map((i) => (
          <li key={`${i.network}:${i.address}`}><Link href={`/token/${i.network}/${i.address}`} className="glass-flat hover-lift flex items-center gap-3 p-3">
            <TokenLogo src={i.live?.imageUrl} symbol={i.live?.symbol ?? "?"} size={40} />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{i.live?.name ?? "Token"} <span className="text-muted">{i.live?.symbol}</span></span><span className="block truncate text-xs text-muted">{getNetwork(i.network)?.name ?? i.network}</span></span>
            <span className="num text-right text-sm"><span className="block font-semibold">{priceUsd(i.live?.priceUsd)}</span><span className="block text-xs text-muted">{usdCompact(i.live?.liquidityUsd)} liq</span></span><Star size={15} className="fill-[var(--warm)] text-warm" />
          </Link></li>))}</ul>))}
      <p className="text-xs text-muted">Signed in as {data.email ?? "your account"}.</p>
    </div>
  );
}
