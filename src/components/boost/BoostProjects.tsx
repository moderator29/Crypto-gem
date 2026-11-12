"use client";

import { AlertTriangle, ArrowRight, Search, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PACK_EVENT, readPack, validPack } from "./packSelection";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork, NETWORKS } from "@/lib/market-data/networks";
import { shortAddress } from "@/lib/utils/format";

interface Project { id: string; name: string; symbol: string; network_id: string | null; address: string | null; logo_url: string | null; verification: string; boostEndsAt: string | null }
interface Resp { configured: boolean; total: number; page: number; pageSize: number; projects: Project[]; error?: string }

const CHAINS = NETWORKS.filter((n) => n.contractLookup).slice(0, 12);

export function BoostProjects({ packs }: { packs: Array<{ id: string; name: string }> }) {
  const [packId, setPackId] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [q, setQ] = useState("");
  const [network, setNetwork] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Resp | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const sync = (bump: boolean) => {
      setPackId(validPack(readPack(), packs));
      if (bump) setFlash((n) => n + 1);
    };
    const t = setTimeout(() => sync(false), 0);
    const on = () => sync(true);
    window.addEventListener(PACK_EVENT, on);
    return () => {
      clearTimeout(t);
      window.removeEventListener(PACK_EVENT, on);
    };
  }, [packs]);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ page: String(page), ...(q.trim() ? { q: q.trim() } : {}), ...(network ? { network } : {}) });
        const res = await fetch(`/api/boost/projects?${qs}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("failed");
        setData((await res.json()) as Resp);
        setState("ok");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, q ? 300 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, network, page]);

  const pack = packs.find((p) => p.id === packId);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const change = (fn: () => void) => {
    setState("loading");
    fn();
  };

  return (
    <section id="boost-projects" aria-label="Choose a project to boost" className="scroll-mt-24 space-y-4">
      {pack && (
        <div key={flash} className="pack-banner card-lit flex min-w-0 items-center gap-3 p-3 text-sm font-semibold" role="status">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-warm"><Zap size={18} aria-hidden="true" /></span>
          <span className="min-w-0 break-words">Choose the coin to boost with {pack.name}</span>
        </div>
      )}
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input !pl-11" value={q} onChange={(e) => change(() => { setQ(e.target.value); setPage(1); })} placeholder="Search coin name, symbol or contract" aria-label="Search listed projects" />
      </div>
      <div className="scroll-x">
        <button type="button" className="chip" aria-pressed={network === null} onClick={() => change(() => { setNetwork(null); setPage(1); })}>All chains</button>
        {CHAINS.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={network === c.id} onClick={() => change(() => { setNetwork(c.id); setPage(1); })}>{c.name}</button>
        ))}
      </div>

      <div className="flex items-end justify-between">
        <h2 className="font-display text-xl font-bold">Choose a coin to boost</h2>
        {data?.configured && <span className="num text-sm text-muted">{data.total} project{data.total === 1 ? "" : "s"}</span>}
      </div>

      {state === "loading" && <div className="space-y-2" aria-busy="true">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-[72px]" />)}</div>}
      {state === "error" && <div className="card flex items-center gap-2 p-5 text-sm" role="alert"><AlertTriangle size={16} className="text-down" /> Could not load projects. Try again shortly.</div>}

      {state === "ok" && data && !data.configured && (
        <div className="card p-6 text-sm text-soft">The project database is not connected in this environment, so there is nothing to select. Only listed projects can be boosted, so none are invented.</div>
      )}
      {state === "ok" && data?.configured && data.projects.length === 0 && (
        <div className="card space-y-3 p-6 text-sm text-soft">
          <p>{q || network ? "No listed projects match." : "No projects are listed yet."} Boost is available to projects already listed on Crypto Gems.</p>
          <Link href="/add-coin" className="btn btn-primary inline-flex">List your token first</Link>
        </div>
      )}
      {state === "ok" && data?.configured && data.projects.length > 0 && (
        <ul className="grid gap-2">
          {data.projects.map((p) => (
            <li key={p.id}>
              <Link href={pack ? `/boost/${p.id}?pack=${encodeURIComponent(pack.id)}` : `/boost/${p.id}`} className="card-flat hover-lift flex items-center gap-3 p-3">
                <TokenLogo src={p.logo_url} symbol={p.symbol} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{p.symbol} · {getNetwork(p.network_id ?? "")?.name ?? "Network not set"}{p.address ? ` · ${shortAddress(p.address)}` : ""}</span>
                </span>
                {p.boostEndsAt && <span className="chip !min-h-7 !px-2 text-[11px]"><Zap size={11} /> Boosted</span>}
                <span className="btn btn-sm btn-primary shrink-0"><Zap size={14} aria-hidden="true" /> Boost <ArrowRight size={14} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {state === "ok" && pages > 1 && (
        <div className="scroll-x justify-center" role="navigation" aria-label="Pages">
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" className="chip !min-h-10 !w-10 !justify-center !px-0" aria-pressed={page === n} onClick={() => change(() => setPage(n))}>{n}</button>
          ))}
          {pages > 7 && <span className="badge">… {pages}</span>}
        </div>
      )}
    </section>
  );
}
