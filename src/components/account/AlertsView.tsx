"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { useToast } from "@/components/ui/Toast";
import { getNetwork } from "@/lib/market-data/networks";
import { accountCall, useAccountFetch } from "@/lib/useAccountFetch";
import { priceUsd } from "@/lib/utils/format";

interface Alert { id: string; network_id: string; address: string; symbol: string | null; name: string | null; direction: "above" | "below"; price_usd: number; triggered_at: string | null; triggered_price: number | null }
interface Hit { networkId: string; address: string; name: string; symbol: string; imageUrl: string | null; priceUsd: number | null }

/** Create and manage price alerts. The scheduled job checks live prices and writes a notification when one fires. */
export function AlertsView() {
  const res = useAccountFetch<{ alerts: Alert[] }>("/api/alerts");
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).then((j: { results?: Hit[] }) => setHits(j.results ?? [])).catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function create() {
    const n = Number(price);
    if (!token || !Number.isFinite(n) || n <= 0) return toast.error("Pick a token and enter a price above zero.");
    setBusy(true);
    try {
      await accountCall("/api/alerts", "POST", { network: token.networkId, address: token.address, symbol: token.symbol, name: token.name, direction: dir, price: n });
      toast.success(`Alert set for ${token.symbol}`);
      setPrice("");
      res.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the alert");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    try {
      await accountCall(`/api/alerts?id=${id}`, "DELETE");
      res.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  }

  if (res.state === "signin") return <EmptyState title="Sign in to set price alerts" description="Alerts are checked every few minutes and land in your notifications." action={<Link href="/login?next=/alerts" className="btn btn-primary">Sign in</Link>} />;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
      <section className="card space-y-4 p-4 md:p-5" aria-label="New alert">
        <h2 className="h3">New alert</h2>
        {token ? (
          <div className="card-flat flex items-center gap-3 p-3">
            <TokenLogo src={token.imageUrl} symbol={token.symbol} size={36} networkId={token.networkId} address={token.address} />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{token.name}</span><span className="text-xs text-muted">{token.symbol} · {getNetwork(token.networkId)?.name}{token.priceUsd ? ` · now ${priceUsd(token.priceUsd)}` : ""}</span></span>
            <button type="button" className="btn btn-sm" onClick={() => setToken(null)}>Change</button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-semibold" htmlFor="alert-q">Token</label>
            <input id="alert-q" className="input" placeholder="Search a token or paste a contract" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
            {hits.length > 0 && q.trim().length >= 2 && (
              <ul className="card-flat max-h-64 divide-y divide-[var(--line-1)] overflow-y-auto">
                {hits.map((h) => (
                  <li key={`${h.networkId}:${h.address}`}>
                    <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-3)]" onClick={() => { setToken(h); setHits([]); setQ(""); }}>
                      <TokenLogo src={h.imageUrl} symbol={h.symbol} size={30} networkId={h.networkId} address={h.address} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{h.name} <span className="font-medium text-muted">{h.symbol}</span></span>
                      <span className="text-xs text-muted">{getNetwork(h.networkId)?.name}</span>
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
          <input className="input num" inputMode="decimal" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={() => void create()}>{busy ? "Saving" : "Create alert"}</button>
        <p className="text-xs text-muted">Alerts use DEX pool prices and are checked every few minutes. They are not trading advice and not a guarantee of timing.</p>
      </section>

      <section aria-label="Your alerts" className="space-y-3">
        <h2 className="h3">Your alerts</h2>
        {res.state === "loading" ? <div className="skeleton h-24" /> : res.state === "error" ? <EmptyState tone="error" title="Alerts are unavailable" description={res.message} /> : res.data.alerts.length === 0 ? (
          <EmptyState title="No alerts yet" description="Pick a token, a direction and a price. You will be notified when it crosses." />
        ) : (
          <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
            {res.data.alerts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <TokenLogo src={null} symbol={a.symbol ?? "?"} size={34} networkId={a.network_id} address={a.address} />
                <span className="min-w-0 flex-1">
                  <Link href={`/token/${a.network_id}/${a.address}`} className="block truncate font-semibold hover:text-brand">{a.symbol ?? a.name ?? "Token"}</Link>
                  <span className="text-sm text-soft">{a.direction === "above" ? "Above" : "Below"} <span className="num font-semibold">{priceUsd(Number(a.price_usd))}</span></span>
                </span>
                <span className={`badge ${a.triggered_at ? "badge-up" : ""}`}>{a.triggered_at ? `Fired at ${priceUsd(a.triggered_price)}` : "Watching"}</span>
                <button type="button" className="btn btn-icon btn-sm btn-ghost" aria-label={`Remove alert for ${a.symbol ?? "token"}`} onClick={() => void remove(a.id)}><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
