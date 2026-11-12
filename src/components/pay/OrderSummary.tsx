"use client";

import { ChevronDown, Lock, ShieldCheck, Timer } from "lucide-react";
import { useState } from "react";
import { formatCountdown, formatUsd, kindLabel } from "./payHelpers";
import type { OrderInfo } from "./types";

interface Props {
  order: OrderInfo;
  remaining: number | null;
  paid: boolean;
}

/** Order card. Sticky on desktop, collapsed behind a header on phones so the payment flow stays first. */
export function OrderSummary({ order, remaining, paid }: Props) {
  const [open, setOpen] = useState(false);
  const label = kindLabel(order.kind);
  return (
    <aside className="pay-summary card card-lit" aria-label="Order summary">
      <button type="button" className="pay-summary-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="min-w-0 text-left">
          <span className="eyebrow block">{paid ? "Paid order" : "Your order"}</span>
          <span className="mt-1 block truncate text-sm font-semibold">{label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="num text-lg font-bold">{formatUsd(order.price_usd)}</span>
          <ChevronDown size={18} className={`pay-summary-chev ${open ? "pay-open" : ""}`} aria-hidden="true" />
        </span>
      </button>
      <div className={`pay-summary-body ${open ? "pay-summary-open" : ""}`}>
        <dl className="space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">Item</dt>
            <dd className="text-right font-semibold">{label}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">Price</dt>
            <dd className="num text-right text-lg font-bold">{formatUsd(order.price_usd)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">Order</dt>
            <dd className="num min-w-0 truncate text-right text-xs text-soft">{order.id.slice(0, 8)}</dd>
          </div>
          {remaining !== null && !paid && (
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted"><Timer size={14} aria-hidden="true" /> Quote expires in</dt>
              <dd className={`num font-bold ${remaining < 120 ? "text-down" : ""}`}>{remaining > 0 ? formatCountdown(remaining) : "Expired"}</dd>
            </div>
          )}
        </dl>
        <ul className="pay-notes">
          <li><Lock size={14} aria-hidden="true" /> Non-custodial. You send from your own wallet and nobody holds your keys.</li>
          <li><ShieldCheck size={14} aria-hidden="true" /> Confirmed on the network before anything is activated.</li>
          <li><ShieldCheck size={14} aria-hidden="true" /> Each quote has its own address. Never reuse an old one.</li>
        </ul>
      </div>
    </aside>
  );
}
