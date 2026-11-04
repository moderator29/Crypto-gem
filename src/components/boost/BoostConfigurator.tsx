"use client";

import { Check, ChevronDown, Clock, Loader2, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { TokenLogo } from "@/components/ui/TokenLogo";
import type { BoostPack } from "@/lib/ads/catalog";
import { accessToken } from "@/lib/auth/client";

interface Method { id: string; label: string; provider_currency: string; network: string }
interface Project { name: string; symbol: string; logo: string | null; network: string | null; networkId: string | null; address: string | null }

const duration = (h: number) => (h >= 48 ? `${h / 24} days` : h === 24 ? "1 day" : `${h} hours`);
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

const FAQ = [
  ["What does a boost buy?", "Clearly labelled sponsored visibility on Discover and a Boosted badge on coin lists and your token page. Higher packs rotate with higher priority and a richer card."],
  ["Does it change my organic rank?", "No. Organic rank comes from volume, liquidity, activity and momentum. A boost never moves it and never guarantees a position."],
  ["When does it start?", "As soon as the payment is verified on the network. If the project already has a boost running, the new one starts when that one ends."],
  ["Can I buy more than one?", "Yes. Packs for the same project queue back to back and never overlap, so nothing you buy is wasted."],
] as const;

/** Pack picker, order summary and payment list for one project. Pricing is read from the server, never typed here. */
export function BoostConfigurator({ submissionId, project, packs }: { submissionId: string; project: Project; packs: BoostPack[] }) {
  const router = useRouter();
  const [packId, setPackId] = useState(packs.find((p) => p.label === "Popular")?.id ?? packs[0]?.id ?? "");
  const [methods, setMethods] = useState<Method[]>([]);
  const [methodsState, setMethodsState] = useState<"loading" | "ok">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "error" | "signin"; text: string } | null>(null);
  const [open, setOpen] = useState<number | null>(0);
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="space-y-6">
        <section aria-label="Choose a pack" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="h3">Choose a pack</h2>
            <span className="eyebrow">Up to {Math.max(...packs.map((p) => p.hours)) / 24} days</span>
          </div>
          <div className="stagger grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {packs.map((p) => {
              const on = packId === p.id;
              return (
                <button key={p.id} type="button" aria-pressed={on} onClick={() => setPackId(p.id)} className={`boost-pack hover-lift relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left ${on ? "border-[var(--brand)] shadow-[0_0_0_1px_var(--brand),0_10px_34px_color-mix(in_srgb,var(--neon-glow)_35%,transparent)]" : "border-[var(--line-1)]"}`} style={{ ["--tier" as string]: p.priority }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-baseline gap-2"><Zap size={16} className="self-center text-warm" aria-hidden="true" /><span className="num text-4xl font-bold leading-none">{p.credits.toLocaleString("en-US")}</span><span className="eyebrow !text-muted">Boost</span></span>
                    {on ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-white"><Check size={14} /></span> : p.label ? <span className="badge badge-brand">{p.label}</span> : null}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-soft"><Clock size={14} aria-hidden="true" /> {duration(p.hours)}</div>
                  <ul className="flex-1 space-y-1.5 text-[13px] text-soft">{p.allocations.map((a) => <li key={a} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-up" aria-hidden="true" /> {a}</li>)}</ul>
                  <div className="flex items-end justify-between">
                    <span className="num text-3xl font-bold">{usd(p.priceUsd)}</span>
                    <span className="text-xs text-muted">{usd(Math.round((p.priceUsd / (p.hours / 24)) * 100) / 100)} / day</span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">A boost buys clearly labelled sponsored visibility. It never changes organic rank and does not guarantee a position. Boost points describe the size of the pack.</p>
        </section>

        <section aria-label="Frequently asked questions" className="card divide-y divide-[var(--line-1)] overflow-hidden">
          {FAQ.map(([q, a], i) => (
            <div key={q}>
              <button type="button" className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                {q}<ChevronDown size={17} className={`shrink-0 text-muted transition ${open === i ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {open === i && <p className="px-4 pb-4 text-sm text-soft">{a}</p>}
            </div>
          ))}
        </section>
      </div>

      <aside aria-label="Checkout" className="card space-y-4 p-4 md:p-5 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
        <h2 className="h3">Order summary</h2>
        <div className="card-flat flex items-center gap-3 p-3">
          <TokenLogo src={project.logo} symbol={project.symbol} size={40} networkId={project.networkId ?? undefined} address={project.address} />
          <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{project.name}</span><span className="flex items-center gap-1.5 text-xs text-muted">{project.networkId && <ChainBadge networkId={project.networkId} size={14} />}{project.symbol}{project.network ? ` · ${project.network}` : ""}</span></span>
          <span className="badge badge-sponsored"><Zap size={11} /> Sponsored</span>
        </div>
        {pack && (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Pack</dt><dd className="font-semibold">{pack.name} · {pack.credits.toLocaleString("en-US")} boost</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Duration</dt><dd className="font-semibold">{duration(pack.hours)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3"><dt className="font-semibold">Amount due</dt><dd className="num text-2xl font-bold text-warm">{usd(pack.priceUsd)}</dd></div>
          </dl>
        )}

        <div className="space-y-3 border-t border-line pt-4">
          <h3 className="eyebrow">Pay with crypto</h3>
          {methodsState === "loading" && <div className="skeleton h-24" />}
          {methodsState === "ok" && methods.length === 0 && <p className="card-flat p-3 text-sm text-soft">No payment options are enabled right now. They appear here once payments are configured and verified by an administrator.</p>}
          {groups.map((g) => (
            <div key={g} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted">{g}</p>
              {methods.filter((m) => m.label === g).map((m) => (
                <button key={m.id} type="button" disabled={busy !== null || !pack} onClick={() => void pay(m.provider_currency)} className="card-flat hover-lift flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold disabled:opacity-60">
                  <span>{m.label} · {m.network}</span>
                  <span className="inline-flex items-center gap-1 text-brand">{busy === m.provider_currency && <Loader2 size={15} className="animate-spin" />} Pay →</span>
                </button>
              ))}
            </div>
          ))}
          {msg && <p className="card-flat p-3 text-sm" role={msg.kind === "error" ? "alert" : "status"}>{msg.text} {msg.kind === "signin" && <Link href={`/login?next=${encodeURIComponent(typeof location === "undefined" ? "/boost" : location.pathname)}`} className="font-semibold text-brand">Sign in</Link>}</p>}
          <p className="flex items-center justify-center gap-2 text-center text-xs text-muted"><ShieldCheck size={14} aria-hidden="true" /> Activates only after the payment is verified by our server.</p>
        </div>
      </aside>
    </div>
  );
}
