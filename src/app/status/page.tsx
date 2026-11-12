import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { providerHealth } from "@/lib/market-data/http";
import { geckoTerminal } from "@/lib/market-data/providers/geckoterminal";
import { supabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Data status", description: "Which data sources and services are working right now." };

async function probe(): Promise<{ ok: boolean; ms: number; stale: boolean }> {
  const t0 = Date.now();
  try {
    const r = await geckoTerminal.trendingPools();
    return { ok: true, ms: Date.now() - t0, stale: r.stale };
  } catch {
    return { ok: false, ms: Date.now() - t0, stale: false };
  }
}

function Row({ name, detail, ok, label }: { name: string; detail: string; ok: boolean | null; label: string }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ok === null ? "bg-[var(--text-muted)]" : ok ? "bg-[var(--up)]" : "bg-[var(--down)]"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1"><span className="block font-semibold">{name}</span><span className="block text-sm text-muted">{detail}</span></span>
      <span className={`badge ${ok ? "badge-up" : ok === false ? "badge-down" : ""}`}>{label}</span>
    </li>
  );
}

/** Honest service status measured on request: a live probe of the market provider plus configuration checks. */
export default async function StatusPage() {
  const gt = await probe();
  const health = providerHealth();
  const open = health.filter((h) => h.state === "open");
  const env = (k: string) => Boolean(process.env[k]);
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Data status" }]} eyebrow="Platform" title="Data status" description="Prices come from public DEX data providers. When one is slow, lists may be cached or empty. This page shows what we measure right now." />
      <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
        <Row name="GeckoTerminal (markets, pools, candles)" detail={gt.ok ? `Responded in ${gt.ms} ms${gt.stale ? ", serving cached data" : ""}` : "Not responding or rate limited. Lists fall back to cache when available."} ok={gt.ok && !gt.stale} label={gt.ok ? (gt.stale ? "Cached" : "Operational") : "Down"} />
        <Row name="Provider circuit breakers" detail={open.length ? `Cooling down: ${open.map((o) => o.provider).join(", ")}` : "No provider is cooling down after failures."} ok={open.length === 0} label={open.length ? "Degraded" : "Clear"} />
        <Row name="Accounts and database" detail="Watchlists, alerts, notifications, orders and listings." ok={supabaseConfigured()} label={supabaseConfigured() ? "Connected" : "Not connected"} />
        <Row name="Payments (direct crypto)" detail="USDT, USDC, ETH and BNB on EVM chains and USDC on Solana, verified on chain." ok={supabaseConfigured()} label={supabaseConfigured() ? "Live" : "Needs database"} />
        <Row name="AI Copilot" detail="Answers use live market data when the model service is configured." ok={env("ANTHROPIC_API_KEY")} label={env("ANTHROPIC_API_KEY") ? "Configured" : "Offline"} />
        <Row name="Token security checks (GoPlus)" detail="Honeypot, tax and ownership flags for EVM tokens on token pages." ok={null} label="On demand" />
      </ul>
      <p className="mt-3 text-xs text-muted">Checked just now. Status is measured from this server, not a third-party monitor, and is not a guarantee of future uptime.</p>
    </div>
  );
}
