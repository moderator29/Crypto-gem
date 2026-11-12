/* eslint-disable @next/next/no-img-element */

import { ExternalLink } from "lucide-react";
import type { ReceiptData } from "@/lib/checkout/types";
import { SITE } from "@/lib/site";
import { formatUsd, kindLabel, when } from "./helpers";

/** Print friendly receipt. Every value comes from a server-signed receipt token. */
export function ReceiptDocument({ r }: { r: ReceiptData }) {
  return (
    <article className="co-receipt co-glass" aria-label={`Receipt ${r.number}`}>
      <header className="co-receipt-head">
        <div className="co-row min-w-0">
          <img src="/logo-128.webp" alt="" width={40} height={40} className="co-receipt-logo" />
          <div className="min-w-0">
            <p className="co-receipt-brand">{SITE.name}</p>
            <p className="co-muted text-xs">Payment receipt</p>
          </div>
        </div>
        <span className="co-paid">Paid</span>
      </header>

      <dl className="co-receipt-grid">
        <div>
          <dt>Receipt number</dt>
          <dd className="num">{r.number}</dd>
        </div>
        <div>
          <dt>Confirmed</dt>
          <dd>{when(r.paidAt)}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{kindLabel(r.kind)}</dd>
        </div>
        <div>
          <dt>Quoted</dt>
          <dd>{when(r.quotedAt)}</dd>
        </div>
      </dl>

      <section className="co-receipt-section">
        <h2 className="co-receipt-h">{r.title}</h2>
        <ul className="co-order-lines">
          {r.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      <section className="co-receipt-section">
        <dl className="co-receipt-grid">
          <div>
            <dt>Paid</dt>
            <dd className="num">
              {r.received} {r.asset}
            </dd>
          </div>
          <div>
            <dt>Network</dt>
            <dd>{r.networkLabel}</dd>
          </div>
          <div className="co-span-2">
            <dt>Sent to</dt>
            <dd className="num co-break">{r.toAddress}</dd>
          </div>
          <div className="co-span-all">
            <dt>Transaction</dt>
            <dd className="num co-break">
              <a className="co-inline-link" href={r.explorerTxUrl} target="_blank" rel="noopener noreferrer">
                {r.txHash} <ExternalLink size={12} className="co-no-print" />
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <div className="co-receipt-section co-receipt-total">
        <span>Total</span>
        <span className="num">{formatUsd(r.priceUsd)}</span>
      </div>

      <div className="co-receipt-notes">
        <p>This receipt is signed by {SITE.name}. Changing any value invalidates it.</p>
        <p>The payment was sent from the buyer&apos;s own wallet straight to {SITE.name} and confirmed on chain. Crypto payments are final; message an admin on Telegram ({SITE.admins.map((a) => a.label).join(" or ")}) with the receipt number for help.</p>
      </div>
    </article>
  );
}
