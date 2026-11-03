"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { trustTokenLogo } from "@/lib/trustwallet";

/** Real logo: provider image first, then the Trust Wallet asset pack, then a neutral monogram. Never an invented logo. */
export function TokenLogo({ src, symbol, size = 40, networkId, address }: { src: string | null | undefined; symbol: string; size?: number; networkId?: string; address?: string | null }) {
  const trust = networkId ? trustTokenLogo(networkId, address) : null;
  const chain = [src, trust].filter((u, i, a): u is string => !!u && a.indexOf(u) === i);
  const [failed, setFailed] = useState(0);
  const style = { width: size, height: size };
  const current = chain[failed];
  if (current) {
    return <img key={current} src={current} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed((n) => n + 1)} style={style} className="shrink-0 rounded-lg bg-[var(--surface-3)] object-cover" />;
  }
  return (
    <span style={{ ...style, fontSize: size * 0.38 }} className="grid shrink-0 place-items-center rounded-lg bg-[var(--surface-3)] font-bold text-soft shadow-[inset_0_0_0_1px_var(--line-2)]" aria-hidden="true">
      {symbol.slice(0, 2).toUpperCase()}
    </span>
  );
}
