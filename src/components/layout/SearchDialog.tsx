"use client";

import { ArrowLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNetwork } from "@/lib/market-data/networks";
import { priceUsd, shortAddress, usdCompact } from "@/lib/utils/format";
import { TokenLogo } from "@/components/ui/TokenLogo";

interface Result {
  networkId: string;
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number | null;
  liquidityUsd: number | null;
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [isAddress, setIsAddress] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      clearTimeout(t);
      previous?.focus?.();
    };
  }, [open]);

  // Keep Tab inside the dialog while it is open.
  useEffect(() => {
    if (!open) return;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const f = [...panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
      if (f.length === 0) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => window.removeEventListener("keydown", trap);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("search failed");
        const j = (await res.json()) as { results: Result[]; isAddress: boolean };
        setResults(j.results);
        setIsAddress(j.isAddress);
        setState("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (!open) return null;
  const shown = q.trim().length < 2 ? [] : results;
  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-[var(--bg)] sm:items-start sm:bg-black/55 sm:p-3 sm:pt-[10vh] sm:backdrop-blur-sm" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Search">
      <div ref={panelRef} className="flex w-full max-w-xl flex-col overflow-hidden bg-[var(--canvas)] sm:glass-float sm:!bg-[var(--surface-1)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <button type="button" onClick={onClose} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full text-soft sm:hidden">
            <ArrowLeft size={20} />
          </button>
          <Search size={18} className="hidden text-muted sm:block" />
          <form className="flex-1" role="search" onSubmit={(e) => { e.preventDefault(); const v = q.trim(); if (v.length >= 2) { onClose(); router.push(`/search?q=${encodeURIComponent(v)}`); } }}>
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tokens" placeholder="Search name, symbol or paste a contract address" className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted" />
          </form>
          <button type="button" onClick={onClose} aria-label="Close search" className="hidden h-9 w-9 place-items-center rounded-full text-muted hover:text-text sm:grid">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 sm:max-h-[60vh] sm:flex-none">
          {state === "loading" && <div className="skeleton m-2 h-12" />}
          {state === "error" && <p className="p-4 text-sm text-down">Search is temporarily unavailable. Try again shortly.</p>}
          {state === "idle" && q.trim().length >= 2 && shown.length === 0 && (
            <p className="p-4 text-sm text-muted">{isAddress ? "No pool found for this address." : "No matches."}</p>
          )}
          {state !== "error" &&
            shown.map((r) => (
              <Link key={`${r.networkId}:${r.address}`} href={`/token/${r.networkId}/${r.address}`} onClick={onClose} className="flex items-center gap-3 rounded-xl p-3 hover:bg-[var(--border)]">
                <TokenLogo src={r.imageUrl} symbol={r.symbol} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {r.name} <span className="font-medium text-muted">{r.symbol}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {getNetwork(r.networkId)?.name ?? r.networkId} · {shortAddress(r.address)}
                  </span>
                </span>
                <span className="num text-right text-sm">
                  <span className="block">{priceUsd(r.priceUsd)}</span>
                  <span className="block text-xs text-muted">{usdCompact(r.liquidityUsd)} liq</span>
                </span>
              </Link>
            ))}
          {q.trim().length >= 2 && <Link href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={onClose} className="mx-1 mb-1 flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold text-brand transition hover:bg-[var(--surface-2)]">See all results for “{q.trim().slice(0, 40)}” <span aria-hidden="true">↵</span></Link>}
          {shown.length > 0 && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-muted">Suggestions · {shown.length}</p>}
          {q.trim().length < 2 && <p className="p-4 text-sm text-muted">Same symbol can exist on many networks. Results show the network and address so you pick the right one.</p>}
        </div>
      </div>
    </div>
  );
}
