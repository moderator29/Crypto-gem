"use client";

import { Bell, LayoutGrid, List, Receipt, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { CountUp } from "@/components/fx/CountUp";
import { Stat } from "@/components/ui/Kit";
import { NavIcon } from "@/components/ui/NavIcon";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { useToast } from "@/components/ui/Toast";
import { useAlertChecker, useLocalAlerts } from "@/lib/local/alerts";
import { useLivePrices, type LivePrice } from "@/lib/local/prices";
import { receiptTime, removeLocalReceipt, useLocalReceipts, type LocalReceipt } from "@/lib/local/receipts";
import { removeFromWatchlist, useLocalWatchlist, type LocalWatchItem } from "@/lib/local/watchlist";
import { assetKey } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { ageShort, priceUsd, shortAddress } from "@/lib/utils/format";
import { DashEmpty } from "./DashEmpty";
import { ExportButton } from "./ExportButton";
import type { NextStep } from "./logic";
import { NextSteps } from "./NextSteps";

/** Small "saved on this device" label used across the dashboard so nobody expects a sync. */
export function DeviceNote({ className = "" }: { className?: string }) {
  return <p className={`text-xs text-muted ${className}`}>Saved on this device only. It does not sync and is removed if you clear your browser data.</p>;
}

const amountText = (r: LocalReceipt) => {
  const n = typeof r.amount === "number" ? r.amount : Number(r.amount);
  const v = Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 8 }) : String(r.amount);
  return `${v} ${r.asset}`.trim();
};
const whenText = (r: LocalReceipt) => {
  const t = receiptTime(r);
  return Number.isFinite(t) ? `${new Date(t).toISOString().slice(0, 16).replace("T", " ")} UTC` : "—";
};
const safeHref = (h: string) => (h.startsWith("/") && !h.startsWith("//") ? h : null);

function ReceiptRow({ r, onRemove }: { r: LocalReceipt; onRemove?: () => void }) {
  const href = safeHref(r.href);
  const body = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-brand"><Receipt size={18} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{r.title}</span>
        <span className="num block truncate text-xs text-muted">#{r.number} · {whenText(r)}</span>
      </span>
      <span className="num shrink-0 text-right text-sm font-bold">{amountText(r)}</span>
    </>
  );
  return (
    <li className="flex min-w-0 items-center gap-2 px-3 py-3 sm:px-4">
      {href ? <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-90">{body}</Link> : <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>}
      {onRemove && <button type="button" className="btn btn-icon btn-sm btn-ghost shrink-0" aria-label={`Remove receipt ${r.number} from this device`} onClick={onRemove}><Trash2 size={15} /></button>}
    </li>
  );
}

/** Overview: what this device follows, open alerts, recent receipts and the next useful actions. */
export function OverviewView() {
  useAlertChecker();
  const watch = useLocalWatchlist();
  const alerts = useLocalAlerts();
  const receipts = useLocalReceipts();
  const prices = useLivePrices(watch.slice(0, 6));
  const open = alerts.filter((a) => a.firedAt === null).length;
  const steps: NextStep[] = [
    { key: "watch", label: "Watch a token", hint: "Tap the star on any coin", href: "/markets", done: watch.length > 0 },
    { key: "alert", label: "Set a price alert", hint: "Fires while the site is open", href: "/alerts", done: alerts.length > 0 },
    { key: "list", label: "List a coin", hint: "Paste a contract and we detect the rest", href: "/add-coin", done: receipts.some((r) => /listing/i.test(r.title)) },
    { key: "boost", label: "Boost a token", hint: "Clearly labelled sponsored visibility", href: "/boost", done: receipts.some((r) => /boost/i.test(r.title)) },
  ];
  const quick = [
    { href: "/add-coin", icon: "add", label: "List a project" },
    { href: "/boost", icon: "boost", label: "Boost a token" },
    { href: "/promotion", icon: "promo", label: "Book a banner" },
    { href: "/alerts", icon: "alert", label: "Price alerts" },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <section aria-label="This device" className="bento-hero card relative col-span-2 flex flex-col justify-between gap-5 overflow-hidden p-5 md:p-6 lg:row-span-2">
          <div className="relative space-y-2">
            <p className="eyebrow">This device</p>
            <h2 className="font-display text-2xl font-bold leading-tight md:text-3xl">Your dashboard</h2>
            <p className="text-sm text-soft">
              <span className="num font-semibold text-text">{watch.length}</span> token{watch.length === 1 ? "" : "s"} watched, <span className="num font-semibold text-text">{open}</span> open alert{open === 1 ? "" : "s"} and <span className="num font-semibold text-text">{receipts.length}</span> receipt{receipts.length === 1 ? "" : "s"}. No account, nothing to sign in to.
            </p>
          </div>
          <DeviceNote className="relative" />
        </section>
        <div className="flex [&>*]:flex-1"><Stat label="Watching" icon={<Star size={16} aria-hidden="true" />} value={<CountUp value={watch.length} />} /></div>
        <div className="flex [&>*]:flex-1"><Stat label="Open alerts" icon={<Bell size={16} aria-hidden="true" />} value={<CountUp value={open} />} /></div>
        <div className="col-span-2 flex [&>*]:flex-1"><Stat label="Receipts" icon={<Receipt size={16} aria-hidden="true" />} value={<CountUp value={receipts.length} />} /></div>
      </div>

      {watch.length > 0 && (
        <section aria-label="Watchlist" className="card min-w-0 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2"><h2 className="h3">Watchlist</h2><Link href="/dashboard/watchlist" className="text-sm font-semibold text-brand">See all</Link></div>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {watch.slice(0, 6).map((i) => <li key={`${i.network}:${i.address}`}><WatchRow i={i} p={prices.get(assetKey(i.network, i.address))} /></li>)}
          </ul>
        </section>
      )}

      {receipts.length > 0 && (
        <section aria-label="Recent receipts" className="card min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 pt-4"><h2 className="h3">Recent receipts</h2><Link href="/dashboard/receipts" className="text-sm font-semibold text-brand">See all</Link></div>
          <ul className="divide-y divide-[var(--line-1)]">{receipts.slice(0, 3).map((r) => <ReceiptRow key={r.number} r={r} />)}</ul>
        </section>
      )}

      <NextSteps steps={steps} />

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className="card hover-lift nav-tile flex flex-col items-start gap-3 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-3)]"><NavIcon name={q.icon} size={22} /></span>
            <span className="text-sm font-semibold">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function WatchRow({ i, p }: { i: LocalWatchItem; p: LivePrice | undefined }) {
  return (
    <Link href={`/token/${i.network}/${i.address}`} className="card-flat hover-lift flex min-w-0 items-center gap-3 p-3">
      <TokenLogo src={i.logo} symbol={i.symbol || "?"} size={36} networkId={i.network} address={i.address} />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{i.symbol || shortAddress(i.address)}</span><span className="block truncate text-xs text-muted">{getNetwork(i.network)?.name ?? i.network}</span></span>
      <span className="num shrink-0 text-sm font-semibold">{p ? priceUsd(p.priceUsd) : <span className="skeleton inline-block h-3.5 w-14 align-middle" aria-label="Loading price" />}</span>
    </Link>
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

/** Remembers the layout choice. Returns false where storage is blocked, and the choice then lasts for this visit. */
const saveView = (v: "list" | "grid"): boolean => {
  try {
    window.localStorage.setItem(VIEW_KEY, v);
    return true;
  } catch {
    return false;
  }
};

/** Watchlist saved on this device, as a list or card grid (remembered), with live prices, a quick filter, CSV export and remove. */
export function WatchlistView() {
  const watch = useLocalWatchlist();
  const prices = useLivePrices(watch);
  const toast = useToast();
  const [view, setView] = useState<"list" | "grid">("list");
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setView(readView()), 0);
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && el && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? watch.filter((i) => `${i.name} ${i.symbol} ${getNetwork(i.network)?.name ?? i.network}`.toLowerCase().includes(needle)) : watch;
  }, [watch, q]);
  if (watch.length === 0) return <DashEmpty icon={Star} title="Your watchlist is empty" description="Tap the star on any coin, or Watch on a token page. It is saved on this device." action={<ButtonLink href="/markets" variant="primary">Browse markets</ButtonLink>} />;
  const choose = (v: "list" | "grid") => {
    setView(v);
    saveView(v);
  };
  const remove = (i: LocalWatchItem) => {
    removeFromWatchlist(i.network, i.address);
    toast.success(`Removed ${i.symbol || "token"} from your watchlist`);
  };
  const price = (i: LocalWatchItem) => prices.get(assetKey(i.network, i.address));
  const removeBtn = (i: LocalWatchItem) => (
    <button type="button" className="btn btn-icon btn-sm btn-ghost shrink-0" aria-label={`Remove ${i.symbol || "token"} from watchlist`} onClick={() => remove(i)}><Trash2 size={15} /></button>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-48">
          <span className="sr-only">Filter watchlist</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input ref={searchRef} className="input !pl-9" placeholder="Filter by name, symbol or network" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { setQ(""); e.currentTarget.blur(); } }} />
        </label>
        <div className="seg" role="group" aria-label="Layout">
          <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => choose("list")}><List size={16} /></button>
          <button type="button" aria-pressed={view === "grid"} aria-label="Card grid view" onClick={() => choose("grid")}><LayoutGrid size={16} /></button>
        </div>
        <ExportButton name="watchlist" headers={["Name", "Symbol", "Network", "Address", "Price (USD)"]} rows={shown.map((i) => [i.name, i.symbol, getNetwork(i.network)?.name ?? i.network, i.address, price(i)?.priceUsd ?? null])} />
      </div>
      <DeviceNote />
      {shown.length === 0 && <p className="card-flat p-4 text-sm text-muted" role="status">Nothing matches that filter.</p>}
      {view === "list" ? (
        <ul className="stagger grid gap-2">
          {shown.map((i) => {
            const p = price(i);
            return (
              <li key={`${i.network}:${i.address}`} className="card flex min-w-0 items-center gap-2 p-3">
                <Link href={`/token/${i.network}/${i.address}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-90">
                  <TokenLogo src={i.logo} symbol={i.symbol || "?"} size={42} networkId={i.network} address={i.address} />
                  <span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-2"><span className="truncate font-semibold">{i.name || i.symbol || shortAddress(i.address)}</span><ChainBadge networkId={i.network} size={16} /></span><span className="block truncate text-xs text-muted">{i.symbol} · {getNetwork(i.network)?.name ?? i.network}</span></span>
                  <span className="num shrink-0 text-right text-sm font-semibold">{p ? priceUsd(p.priceUsd) : <span className="skeleton inline-block h-3.5 w-14 align-middle" aria-label="Loading price" />}</span>
                </Link>
                {removeBtn(i)}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="watch-grid stagger">
          {shown.map((i) => {
            const p = price(i);
            return (
              <li key={`${i.network}:${i.address}`} className="card hover-lift relative flex min-w-0 flex-col items-center gap-2 p-4 text-center">
                <span className="absolute right-1 top-1">{removeBtn(i)}</span>
                <Link href={`/token/${i.network}/${i.address}`} className="flex min-w-0 max-w-full flex-col items-center gap-2 rounded-lg">
                  <TokenLogo src={i.logo} symbol={i.symbol || "?"} size={52} networkId={i.network} address={i.address} />
                  <span className="max-w-full truncate font-semibold">{i.symbol || shortAddress(i.address)}</span>
                  <span className="flex max-w-full items-center gap-1.5 text-xs text-muted"><ChainBadge networkId={i.network} size={14} /><span className="truncate">{getNetwork(i.network)?.name ?? i.network}</span></span>
                  <span className="num text-sm font-bold">{p ? priceUsd(p.priceUsd) : "…"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted">Prices refresh every minute from DEX pools.</p>
    </div>
  );
}

/** Receipts saved in this browser by the checkout, newest first, with CSV export. */
export function ReceiptsView() {
  const receipts = useLocalReceipts();
  const sorted = useMemo(() => [...receipts].sort((a, b) => (receiptTime(b) || 0) - (receiptTime(a) || 0)), [receipts]);
  if (receipts.length === 0) return <DashEmpty icon={Receipt} title="No receipts yet" description="Payments you complete in this browser for listings, boosts and banners appear here with a link to the receipt." action={<ButtonLink href="/boost" variant="primary">Boost a token</ButtonLink>} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-soft"><span className="num font-semibold text-text">{receipts.length}</span> receipt{receipts.length === 1 ? "" : "s"}{sorted[0] && Number.isFinite(receiptTime(sorted[0])) ? ` · latest ${ageShort(new Date(receiptTime(sorted[0])).toISOString())} ago` : ""}</p>
        <ExportButton name="receipts" headers={["Receipt", "Title", "Amount", "Asset", "Time (UTC)"]} rows={sorted.map((r) => [r.number, r.title, typeof r.amount === "number" ? r.amount : String(r.amount), r.asset, whenText(r)])} />
      </div>
      <DeviceNote />
      <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
        {sorted.map((r) => <ReceiptRow key={r.number} r={r} onRemove={() => { if (window.confirm(`Remove receipt ${r.number} from this device?`)) removeLocalReceipt(r.number); }} />)}
      </ul>
      <p className="text-xs text-muted">Keep a copy of important receipts. If you lose one, message an admin on Telegram with the transaction hash.</p>
    </div>
  );
}
