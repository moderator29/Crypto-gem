"use client";

import { BadgeCheck, Megaphone, Rocket, ShoppingBag } from "lucide-react";
import { formatUsd, kindLabel } from "./helpers";

const ICON = { boost: Rocket, listing: BadgeCheck, banner: Megaphone } as const;

/** Order summary: what is being bought and the catalog price. */
export function OrderCard({ kind, title, lines, priceUsd, amountLine }: { kind: string; title: string; lines: string[]; priceUsd: number; amountLine?: string | null }) {
  const Icon = ICON[kind as keyof typeof ICON] ?? ShoppingBag;
  return (
    <section className="co-glass co-order" aria-label="Order summary">
      <div className="co-order-head">
        <span className="co-order-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">{kindLabel(kind)}</p>
          <h2 className="co-order-title">{title}</h2>
        </div>
      </div>
      <ul className="co-order-lines">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <div className="co-order-total">
        <span>Total</span>
        <span className="num">{formatUsd(priceUsd)}</span>
      </div>
      {amountLine && <p className="co-order-pay num">{amountLine}</p>}
    </section>
  );
}
