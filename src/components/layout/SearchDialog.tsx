"use client";

import { ArrowLeft, Search, X } from "lucide-react";
import Link from "next/link";
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

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
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
      <div className="glass flex w-full max-w-xl flex-col overflow-hidden !rounded-none !border-0 !bg-[var(--bg)] sm:!rounded-[var(--r-lg)] sm:!border sm:!bg-[var(--surface-solid)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <button type="button" onClick={onClose} aria-label="Back" className="grid h-9 w-9 place-items-center rounded-full text-soft sm:hidden">
            <ArrowLeft size={20} />
          </button>
          <Search size={18} className="hidden text-muted sm:block" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, symbol or paste a contract address" className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted" />
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
          {shown.length > 0 && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-muted">Suggestions · {shown.length}</p>}
          {q.trim().length < 2 && <p className="p-4 text-sm text-muted">Same symbol can exist on many networks. Results show the network and address so you pick the right one.</p>}
        </div>
      </div>
    </div>
  );
}
