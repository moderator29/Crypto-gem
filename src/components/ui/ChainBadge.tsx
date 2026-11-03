"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { getNetwork } from "@/lib/market-data/networks";
import { trustChainLogo } from "@/lib/trustwallet";

/** Real chain logo from the Trust Wallet asset pack. If none exists the chain's initials show on a neutral chip. */
export function ChainBadge({ networkId, size = 20, className = "" }: { networkId: string; size?: number; className?: string }) {
  const name = getNetwork(networkId)?.name ?? networkId;
  const src = trustChainLogo(networkId);
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return <img src={src} alt={name} title={name} width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} style={{ width: size, height: size }} className={`shrink-0 rounded-full bg-[var(--surface-3)] object-cover ${className}`} />;
  }
  return (
    <span title={name} aria-label={name} role="img" style={{ width: size, height: size, fontSize: size * 0.4 }} className={`inline-grid shrink-0 place-items-center rounded-full bg-[var(--surface-3)] font-bold text-soft shadow-[inset_0_0_0_1px_var(--line-2)] ${className}`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
