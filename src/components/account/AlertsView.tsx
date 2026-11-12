"use client";

import { BellRing, Info, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { playSound } from "@/components/fx/sound";
import { EmptyState } from "@/components/ui/EmptyState";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { useToast } from "@/components/ui/Toast";
import { addLocalAlert, rearmLocalAlert, removeLocalAlert, requestNotificationPermission, useAlertChecker, useLocalAlerts, useNotificationPermission } from "@/lib/local/alerts";
import { useLivePrices } from "@/lib/local/prices";
import { assetKey } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { ageShort, priceUsd } from "@/lib/utils/format";

interface Hit { networkId: string; address: string; name: string; symbol: string; imageUrl: string | null; priceUsd: number | null }

/** Browser notification switch with an honest explanation for each permission state. */
export function NotifyPermission() {
  const perm = useNotificationPermission();
  const toast = useToast();
  if (perm === "granted") return <p className="flex items-center gap-2 text-xs text-up"><BellRing size={14} aria-hidden="true" /> Browser notifications are on for this site.</p>;
  if (perm === "unsupported") return <p className="text-xs text-muted">This browser does not support notifications. Alerts still show inside the site.</p>;
  if (perm === "denied") return <p className="text-xs text-muted">Browser notifications are blocked for this site. Allow them in your browser settings to get a system notification.</p>;
  return (
    <button type="button" className="btn btn-sm w-full sm:w-auto" onClick={() => void requestNotificationPermission().then((p) => (p === "granted" ? toast.success("Notifications on", "You will get a system notification when an alert fires.") : undefined))}>
      <BellRing size={14} aria-hidden="true" /> Turn on browser notifications
    </button>
  );
}

/**
 * Create and manage price alerts saved on this device. A small checker in the page fetches
 * live prices every minute while the site is open and fires a toast, a sound, a browser
 * notification (when allowed) and a local notification when a target is crossed.
 */
export function AlertsView() {
  useAlertChecker();
  const alerts = useLocalAlerts();
  const params = useSearchParams();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [token, setToken] = useState<Hit | null>(() => {
    const network = params.get("network");
    const address = params.get("address");
    const symbol = params.get("symbol");
    return network && address && symbol ? { networkId: network, address, name: params.get("name") || symbol, symbol, imageUrl: null, priceUsd: Number(params.get("price")) || null } : null;
  });
  const [dir, setDir] = useState<"above" | "below">("above");
  const [price, setPrice] = useState("");
  const live = useLivePrices(alerts.filter((a) => a.firedAt === null));

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      void fetch(`/api/search?${new URLSearchParams({ q: q.trim() })}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j: { results?: Hit[] }) => setHits(j.results ?? []))
        .catch((e: Error) => { if (e.name !== "AbortError") setHits([]); });
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const target = Number(price);
  const typed = price.trim() !== "";
  const invalid = typed && (!Number.isFinite(target) || target <= 0);
  const ref = token?.priceUsd ?? null;
  const gap = !invalid && typed && ref ? ((target - ref) / ref) * 100 : null;
  const wrongSide = gap !== null && ((dir === "above" && gap <= 0) || (dir === "below" && gap >= 0));

  function create() {
    if (!token || !Number.isFinite(target) || target <= 0) return toast.error("Pick a token and enter a price above zero.");
    addLocalAlert({ network: token.networkId, address: token.address, symbol: token.symbol, name: token.name, logo: token.imageUrl, direction: dir, price: target });
    playSound("success");
    toast.success(`Alert set for ${token.symbol}`, "Saved on this device.");
    setPrice("");
  }

  const open = alerts.filter((a) => a.firedAt === null);
  const fired = alerts.filter((a) => a.firedAt !== null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
      <section className="card space-y-4 p-4 md:p-5" aria-label="New alert">
        <h2 className="h3">New alert</h2>
        {token ? (
          <div className="card-flat flex min-w-0 items-center gap-3 p-3">
            <TokenLogo src={token.imageUrl} symbol={token.symbol} size={36} networkId={token.networkId} address={token.address} />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{token.name}</span><span className="block truncate text-xs text-muted">{token.symbol} · {getNetwork(token.networkId)?.name}{token.priceUsd ? ` · now ${priceUsd(token.priceUsd)}` : ""}</span></span>
            <button type="button" className="btn btn-sm shrink-0" onClick={() => setToken(null)}>Change</button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-semibold" htmlFor="alert-q">Token</label>
            <input id="alert-q" className="input" placeholder="Search a token or paste a contract" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false} />
            {hits.length > 0 && q.trim().length >= 2 && (
              <ul className="card-flat max-h-64 divide-y divide-[var(--line-1)] overflow-y-auto">
                {hits.map((h) => (
                  <li key={`${h.networkId}:${h.address}`}>
                    <button type="button" className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-3)]" onClick={() => { setToken(h); setHits([]); setQ(""); }}>
                      <TokenLogo src={h.imageUrl} symbol={h.symbol} size={30} networkId={h.networkId} address={h.address} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{h.name} <span className="font-medium text-muted">{h.symbol}</span></span>
                      <span className="shrink-0 text-xs text-muted">{getNetwork(h.networkId)?.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex gap-2" role="group" aria-label="Direction">
          {(["above", "below"] as const).map((d) => <button key={d} type="button" className="chip flex-1 justify-center" aria-pressed={dir === d} onClick={() => setDir(d)}>Price goes {d}</button>)}
        </div>
        <label className="block space-y-2 text-sm font-semibold">Target price (USD)
          <input className="input num" inputMode="decimal" placeholder="0.00" value={price} aria-invalid={invalid} aria-describedby="alert-hint" onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
        </label>
        <p id="alert-hint" className={`text-xs ${invalid || wrongSide ? "text-down" : "text-muted"}`} aria-live="polite">
          {invalid ? "Enter a number above zero." : gap !== null && ref ? `${Math.abs(gap).toFixed(1)}% ${gap >= 0 ? "above" : "below"} the price when you searched (${priceUsd(ref)}).${wrongSide ? " It is already past this target, so it will fire on the next check." : ""}` : token ? "Current price was not available for this token." : "Pick a token to compare with its price."}
        </p>
        <button type="button" className="btn btn-primary w-full" disabled={!token || invalid || !typed} onClick={create}>Create alert</button>
        <NotifyPermission />
        <p className="flex items-start gap-2 text-xs text-muted"><Info size={14} className="mt-px shrink-0" aria-hidden="true" /> Alerts are saved on this device and only fire while the site is open in a tab. Prices come from DEX pools and are checked every minute. Not trading advice.</p>
      </section>

      <section aria-label="Your alerts" className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="h3">Your alerts</h2>
          <span className="badge">Saved on this device</span>
        </div>
        {alerts.length === 0 ? (
          <EmptyState title="No alerts yet" description="Pick a token, a direction and a price. Keep the site open in a tab and you will be told when it crosses." />
        ) : (
          <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
            {[...open, ...fired].map((a) => {
              const now = live.get(assetKey(a.network, a.address));
              return (
                <li key={a.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
                  <TokenLogo src={a.logo} symbol={a.symbol} size={34} networkId={a.network} address={a.address} />
                  <span className="min-w-0 flex-1">
                    <Link href={`/token/${a.network}/${a.address}`} className="block truncate font-semibold hover:text-brand">{a.symbol}</Link>
                    <span className="block truncate text-sm text-soft">{a.direction === "above" ? "Above" : "Below"} <span className="num font-semibold">{priceUsd(a.price)}</span>{a.firedAt === null && now ? <span className="text-muted"> · now <span className="num">{priceUsd(now.priceUsd)}</span></span> : null}</span>
                  </span>
                  {a.firedAt !== null ? (
                    <>
                      <span className="badge badge-up hidden shrink-0 sm:inline-flex">Fired at {priceUsd(a.firedPrice)} · {ageShort(new Date(a.firedAt).toISOString())} ago</span>
                      <span className="badge badge-up shrink-0 sm:hidden">Fired</span>
                      <button type="button" className="btn btn-icon btn-sm btn-ghost shrink-0" aria-label={`Watch ${a.symbol} again`} onClick={() => rearmLocalAlert(a.id)}><RotateCcw size={15} /></button>
                    </>
                  ) : (
                    <span className="badge shrink-0"><span className="status-dot !h-1.5 !w-1.5" aria-hidden="true" /> Watching</span>
                  )}
                  <button type="button" className="btn btn-icon btn-sm btn-ghost shrink-0" aria-label={`Remove alert for ${a.symbol}`} onClick={() => removeLocalAlert(a.id)}><Trash2 size={15} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
