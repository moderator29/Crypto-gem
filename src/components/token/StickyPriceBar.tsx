"use client";

import { useEffect, useState } from "react";
import { TokenLogo } from "@/components/ui/TokenLogo";

/** Compact price bar that slides in under the site header once the token header has scrolled out of view. */
export function StickyPriceBar({ symbol, name, logo, networkId, address, price, change }: { symbol: string; name: string; logo: string | null; networkId: string; address: string; price: string; change: number | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 260);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div aria-hidden={!show} className={`fixed inset-x-0 top-[var(--header-h)] z-40 transition-all duration-300 xl:left-64 ${show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"}`}>
      <div className="mx-auto flex max-w-[1240px] items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--canvas)_88%,transparent)] px-4 py-2 backdrop-blur-xl">
        <TokenLogo src={logo} symbol={symbol} size={28} networkId={networkId} address={address} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name} <span className="font-medium text-muted">{symbol}</span></span>
        <span className="num text-sm font-bold">{price}</span>
        {change !== null && <span className={`num text-xs font-semibold ${change >= 0 ? "text-up" : "text-down"}`}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</span>}
      </div>
    </div>
  );
}
