"use client";

import { ArrowRight, GitCompareArrows, X } from "lucide-react";
import Link from "next/link";
import { compareQuery } from "@/lib/market-data/analytics";
import { clearTray, toggleTray, useCompareTray } from "./compareTray";

/** Floating tray listing tokens queued for comparison, with a link that opens them together. Hidden while empty. */
export function CompareTray() {
  const items = useCompareTray();
  if (items.length === 0) return null;
  return (
    <div className="mk-tray glass-float" role="region" aria-label="Compare tray">
      <GitCompareArrows size={18} className="shrink-0 text-brand" aria-hidden="true" />
      <ul className="scroll-x flex min-w-0 flex-1 items-center gap-1.5">
        {items.map((i) => (
          <li key={`${i.networkId}:${i.address}`} className="chip !min-h-[30px] shrink-0 !px-2.5 !text-xs">
            {i.symbol}
            <button type="button" aria-label={`Remove ${i.symbol} from compare`} onClick={() => toggleTray(i)}><X size={12} aria-hidden="true" /></button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-sm hidden sm:inline-flex" onClick={clearTray}>Clear</button>
      <Link href={`/compare${compareQuery(items.map((i) => ({ networkId: i.networkId, address: i.address })), "pct", "7d")}`} className="btn btn-primary btn-sm shrink-0">
        Compare {items.length} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
