"use client";

import { useEffect, useState } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { getNetwork } from "@/lib/market-data/networks";
import { shortAddress, usdCompact } from "@/lib/utils/format";

interface Candidate { key: string; name: string; symbol: string; imageUrl: string | null; networkId: string | null; address: string | null; source: "dexscreener" | "coingecko"; note: string | null; liquidityUsd: number | null }

/** Name or ticker search for owners without the contract to hand. Picking a result fills the address and network. */
export function TokenFinder({ query, onPick }: { query: string; onPick: (address: string, networkId: string) => void }) {
  const [state, setState] = useState<{ q: string; list: Candidate[] | null; error: boolean }>({ q: "", list: null, error: false });
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/detect/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then(async (r) => ({ ok: r.ok, j: (await r.json()) as { candidates?: Candidate[] } }))
        .then(({ ok, j }) => setState({ q, list: ok ? (j.candidates ?? []) : null, error: !ok }))
        .catch((e: Error) => e.name !== "AbortError" && setState({ q, list: null, error: true }));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const current = state.q === query.trim();
  if (query.trim().length < 2) return null;
  if (!current) return <div className="skeleton h-16" aria-busy="true" />;
  if (state.error) return <p className="text-sm text-soft" role="status">Search is temporarily unavailable. Paste the contract address instead.</p>;
  if (!state.list?.length) return <p className="text-sm text-soft">No match for that name. Paste the contract address, or use Standard Listing if the token has not launched.</p>;
  return (
    <ul className="card-flat divide-y divide-[var(--line-1)] overflow-hidden" aria-label="Matching tokens">
      {state.list.map((c) => {
        const net = c.networkId ? getNetwork(c.networkId) : null;
        const pickable = Boolean(c.address && c.networkId);
        return (
          <li key={c.key}>
            <button type="button" disabled={!pickable} onClick={() => c.address && c.networkId && onPick(c.address, c.networkId)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-60">
              <TokenLogo src={c.imageUrl} symbol={c.symbol} size={36} networkId={c.networkId ?? undefined} address={c.address} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.name} <span className="font-medium text-muted">{c.symbol}</span></span>
                <span className="block truncate text-xs text-muted">{pickable ? `${net?.name ?? c.networkId} · ${shortAddress(c.address as string)}${c.liquidityUsd ? ` · ${usdCompact(c.liquidityUsd)} liquidity` : ""}` : c.note}</span>
              </span>
              <span className="badge">{c.source === "dexscreener" ? "DexScreener" : "CoinGecko"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
