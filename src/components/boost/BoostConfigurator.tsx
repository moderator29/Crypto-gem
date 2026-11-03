"use client";

import { CheckCircle2, Clock, Loader2, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { BoostPack } from "@/lib/ads/catalog";
import { accessToken } from "@/lib/auth/client";

interface Method { id: string; label: string; provider_currency: string; network: string }
interface Project { name: string; symbol: string; logo: string | null; network: string | null }

const duration = (h: number) => (h >= 24 ? `${h / 24} day${h > 24 ? "s" : ""}` : `${h} hours`);

/** Previews exactly what a boost looks like. Always carries the Sponsored label. */
function SponsoredPreview({ project, device }: { project: Project; device: "mobile" | "desktop" }) {
  return (
    <div className={`card-flat mx-auto flex items-center gap-3 p-3 ${device === "mobile" ? "max-w-[320px]" : "max-w-xl"}`}>
      <TokenLogo src={project.logo} symbol={project.symbol} size={device === "mobile" ? 40 : 48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{project.name}</span>
        <span className="block truncate text-xs text-muted">{project.symbol}{project.network ? ` · ${project.network}` : ""}</span>
      </span>
      <span className="chip !min-h-7 !px-2.5 text-[11px] text-warm"><Zap size={11} /> Sponsored</span>
    </div>
  );
}

export function BoostConfigurator({ submissionId, project, packs }: { submissionId: string; project: Project; packs: BoostPack[] }) {
  const router = useRouter();
  const [packId, setPackId] = useState(packs.find((p) => p.label === "Popular")?.id ?? packs[0]?.id ?? "");
  const [methods, setMethods] = useState<Method[]>([]);
  const [methodsState, setMethodsState] = useState<"loading" | "ok">("loading");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "signin"; text: string } | null>(null);
  const pack = packs.find((p) => p.id === packId);

  useEffect(() => {
    fetch("/api/payment-methods").then((r) => r.json()).then((j: { methods?: Method[] }) => { setMethods(j.methods ?? []); setMethodsState("ok"); }, () => setMethodsState("ok"));
  }, []);

  async function pay(currency: string) {
    setMsg(null);
    setBusy(currency);
    const jwt = await accessToken();
    const res = await fetch("/api/boost/orders", { method: "POST", headers: { "content-type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) }, body: JSON.stringify({ submissionId, packId, payCurrency: currency }) });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.status === 401) return setMsg({ kind: "signin", text: "Sign in so the boost is tied to your account." });
    if (!res.ok) return setMsg({ kind: "error", text: j.error ?? "Could not start the payment." });
    router.push(`/pay/${j.orderId}`);
  }

  const groups = [...new Set(methods.map((m) => m.label))];

  return (
    <div className="space-y-6">
      <section aria-label="Choose a pack" className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Choose a pack</h2><span className="text-xs font-bold uppercase tracking-widest text-muted">Up to {Math.max(...packs.map((p) => p.hours)) / 24} days</span></div>
        <div className="grid gap-3 sm:grid-cols-2">
          {packs.map((p) => (
            <button key={p.id} type="button" aria-pressed={packId === p.id} onClick={() => setPackId(p.id)} className={`card hover-lift relative space-y-2 p-4 text-left ${packId === p.id ? "!border-[var(--brand)]" : ""}`}>
              {packId === p.id && <CheckCircle2 size={18} className="absolute right-3 top-3 text-brand" />}
              <div className="flex items-baseline gap-2"><span className="num font-display text-3xl font-bold">{p.credits}</span><span className="text-xs font-bold uppercase tracking-widest text-muted">Boost</span></div>
              <div className="flex items-center gap-1.5 text-sm text-soft"><Clock size={14} /> {duration(p.hours)}</div>
              <ul className="space-y-0.5 text-xs text-muted">{p.allocations.map((a) => <li key={a}>+ {a}</li>)}</ul>
              <div className="flex items-end justify-between pt-1"><span className="num font-display text-2xl font-bold">${p.priceUsd}</span>{p.label && <span className="chip !min-h-6 !px-2 text-[10px]">{p.label}</span>}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">A boost buys clearly labelled sponsored visibility. It never changes organic rank and does not guarantee a position. Credits describe the size of the package, not a ranking.</p>
      </section>

      <section aria-label="Preview" className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">What you get</h2>
          <div className="inline-flex rounded border border-line p-1" role="group" aria-label="Preview device">
            {(["mobile", "desktop"] as const).map((d) => <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={`rounded px-3 py-1 text-xs font-semibold capitalize ${device === d ? "bg-[var(--bg-elev)] text-text" : "text-muted"}`}>{d}</button>)}
          </div>
        </div>
        <SponsoredPreview project={project} device={device} />
        {pack && <ul className="space-y-1 text-sm text-soft">{pack.allocations.map((a) => <li key={a} className="flex gap-2"><span className="text-up">✓</span>{a}</li>)}</ul>}
      </section>

      <section aria-label="Payment" className="card space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-display text-lg font-bold">Choose payment method</h2><p className="text-xs text-muted">Pay with crypto through NOWPayments.</p></div>
          <div className="text-right"><div className="text-[10px] font-bold uppercase tracking-widest text-muted">Amount due</div><div className="num font-display text-2xl font-bold text-warm">${pack?.priceUsd ?? 0}</div></div>
        </div>
        {methodsState === "loading" && <div className="skeleton h-24" />}
        {methodsState === "ok" && methods.length === 0 && <p className="card-flat p-3 text-sm text-soft">No payment options are enabled right now. They appear here once payments are configured and verified by an administrator.</p>}
        {groups.map((g) => (
          <div key={g} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">{g}</h3>
            {methods.filter((m) => m.label === g).map((m) => (
              <button key={m.id} type="button" disabled={busy !== null || !pack} onClick={() => pay(m.provider_currency)} className="card-flat hover-lift flex w-full items-center justify-between px-4 py-3.5 text-left font-semibold disabled:opacity-60">
                <span>{m.label} · {m.network}</span>
                <span className="inline-flex items-center gap-1 text-warm">{busy === m.provider_currency ? <Loader2 size={15} className="animate-spin" /> : null} Pay →</span>
              </button>
            ))}
          </div>
        ))}
        {msg && <p className="card-flat p-3 text-sm" role={msg.kind === "error" ? "alert" : "status"}>{msg.text} {msg.kind === "signin" && <Link href={`/login?next=${encodeURIComponent(location.pathname)}`} className="font-semibold text-brand">Sign in</Link>}</p>}
        <p className="flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck size={14} /> Boost activates only after full payment is verified by our server.</p>
      </section>
    </div>
  );
}
