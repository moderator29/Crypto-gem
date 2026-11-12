"use client";

import { AlertTriangle, ArrowRight, Check, Clock, Loader2, Search, X, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChainBadge } from "@/components/ui/ChainBadge";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { boostCheckoutHref } from "@/lib/local/checkout";
import { classifyAddress } from "@/lib/market-data/identifiers";
import { getNetwork } from "@/lib/market-data/networks";
import { shortAddress, usdCompact } from "@/lib/utils/format";
import { PACK_EVENT, readPack, storePack, validPack } from "./packSelection";

export interface PickerPack { id: string; name: string; priceUsd: number; hours: number; label: string | null }
interface Hit { networkId: string; address: string; name: string; symbol: string; imageUrl: string | null; liquidityUsd: number | null }
type Results = { q: string; state: "ok" | "error"; hits: Hit[]; isAddress: boolean };

const duration = (h: number) => (h >= 48 ? `${h / 24} days` : h === 24 ? "1 day" : `${h} hours`);

/**
 * Boost any token: search by name, symbol or contract through the public search API,
 * pick a result and go straight to checkout with the chosen pack. Nothing is stored on a
 * server. When no pack is chosen yet, the picked token waits here for one.
 */
export function BoostTokenPicker({ packs }: { packs: PickerPack[] }) {
  const router = useRouter();
  const [packId, setPackId] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Results | null>(null);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [going, setGoing] = useState(false);

  const pickedRef = useRef<Hit | null>(null);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);

  const go = useCallback((token: Hit, pack: string) => {
    setGoing(true);
    router.push(boostCheckoutHref({ pack, network: token.networkId, address: token.address, name: token.name, symbol: token.symbol }));
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setPackId(validPack(readPack(), packs)), 0);
    const on = () => {
      const id = validPack(readPack(), packs);
      setPackId(id);
      setFlash((n) => n + 1);
      if (id && pickedRef.current) go(pickedRef.current, id);
    };
    window.addEventListener(PACK_EVENT, on);
    return () => {
      clearTimeout(t);
      window.removeEventListener(PACK_EVENT, on);
    };
  }, [packs, go]);

  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?${new URLSearchParams({ q: term })}`, { signal: ctrl.signal });
        const j = (await r.json().catch(() => ({}))) as { results?: Hit[]; isAddress?: boolean };
        setRes({ q: term, state: r.ok ? "ok" : "error", hits: (j.results ?? []).filter((h) => h.networkId && h.address), isAddress: Boolean(j.isAddress) });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setRes({ q: term, state: "error", hits: [], isAddress: false });
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  const pack = packs.find((p) => p.id === packId) ?? null;
  const current = res?.q === term ? res : null;
  const loading = term.length >= 2 && !current;
  const pastedContract = classifyAddress(term) !== "unknown";

  function pick(h: Hit) {
    if (pack) return go(h, pack.id);
    setPicked(h);
    setQ("");
  }

  return (
    <section id="boost-projects" aria-label="Choose a token to boost" className="boost-picker scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="eyebrow">Step 1</p><h2 className="h2 mt-2">Find the token to boost</h2></div>
        <p className="text-sm text-soft">Any token with a live pool, on any supported chain.</p>
      </div>

      {pack && (
        <div key={flash} className="pack-banner card-lit flex min-w-0 items-center gap-3 p-3 text-sm font-semibold" role="status">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-warm"><Zap size={18} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1 break-words">{pack.name} selected · ${pack.priceUsd.toLocaleString("en-US")} · {duration(pack.hours)}. {picked ? "Taking you to checkout." : "Now pick the token."}</span>
        </div>
      )}

      {picked ? (
        <div className="card card-lit space-y-4 p-4 md:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <TokenLogo src={picked.imageUrl} symbol={picked.symbol} size={48} networkId={picked.networkId} address={picked.address} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-bold">{picked.name} <span className="font-medium text-muted">{picked.symbol}</span></span>
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted"><ChainBadge networkId={picked.networkId} size={14} /><span className="truncate">{getNetwork(picked.networkId)?.name ?? picked.networkId} · <span className="num">{shortAddress(picked.address)}</span></span></span>
            </span>
            <button type="button" className="btn btn-icon btn-sm btn-ghost shrink-0" aria-label="Choose another token" onClick={() => setPicked(null)}><X size={16} /></button>
          </div>
          {going ? (
            <p className="flex items-center gap-2 text-sm text-soft" role="status"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Opening checkout</p>
          ) : (
            <>
              <p className="text-sm font-semibold">Step 2 · Choose a pack</p>
              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:grid-cols-3">
                {packs.map((p) => (
                  <button key={p.id} type="button" onClick={() => storePack(p.id)} className="card-flat hover-lift flex min-w-0 flex-col items-start gap-1 p-3 text-left">
                    <span className="flex w-full items-center justify-between gap-1"><span className="truncate font-semibold">{p.name}</span>{p.label && <span className="badge badge-brand shrink-0 !text-[10px]">{p.label}</span>}</span>
                    <span className="num text-lg font-bold">${p.priceUsd.toLocaleString("en-US")}</span>
                    <span className="flex items-center gap-1 text-xs text-muted"><Clock size={12} aria-hidden="true" /> {duration(p.hours)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input className="input !pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Token name, symbol or contract address" aria-label="Search any token" autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" />
          </div>
          {term.length < 2 && <p className="text-sm text-muted">Type at least two characters, or paste a contract address.</p>}
          {loading && <div className="space-y-2" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-[68px]" />)}</div>}
          {current?.state === "error" && <div className="card flex items-center gap-2 p-4 text-sm" role="alert"><AlertTriangle size={16} className="shrink-0 text-down" aria-hidden="true" /> Search is unavailable right now. Try again in a moment.</div>}
          {current?.state === "ok" && current.hits.length === 0 && (
            <div className="card space-y-3 p-5 text-sm text-soft" role="status">
              <p>{pastedContract || current.isAddress ? "No live pool was found for that contract on the supported chains." : "No token matches that search."} Boost needs a token with a live trading pool.</p>
              <Link href="/add-coin" className="btn btn-sm inline-flex">Not launched yet? Get listed <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>
          )}
          {current?.state === "ok" && current.hits.length > 0 && (
            <ul className="grid gap-2" aria-label="Matching tokens">
              {current.hits.map((h) => (
                <li key={`${h.networkId}:${h.address}`}>
                  <button type="button" onClick={() => pick(h)} disabled={going} className="card-flat hover-lift flex w-full min-w-0 items-center gap-3 p-3 text-left">
                    <TokenLogo src={h.imageUrl} symbol={h.symbol} size={44} networkId={h.networkId} address={h.address} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{h.name} <span className="font-medium text-muted">{h.symbol}</span></span>
                      <span className="block truncate text-xs text-muted">{getNetwork(h.networkId)?.name ?? h.networkId} · <span className="num">{shortAddress(h.address)}</span>{h.liquidityUsd ? ` · ${usdCompact(h.liquidityUsd)} liquidity` : ""}</span>
                    </span>
                    <span className="btn btn-sm btn-primary shrink-0">{pack ? <><Zap size={14} aria-hidden="true" /> <span className="hidden sm:inline">Boost</span></> : <><Check size={14} aria-hidden="true" /> <span className="hidden sm:inline">Select</span></>}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
