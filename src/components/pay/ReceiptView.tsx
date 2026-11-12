"use client";

/* eslint-disable @next/next/no-img-element */

import { ExternalLink, Lock, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { payFetch } from "./payApi";
import { formatAmount, formatUsd, kindLabel } from "./payHelpers";
import type { Receipt } from "./types";

type State = { kind: "loading" } | { kind: "signin" } | { kind: "notfound" } | { kind: "error"; message: string } | { kind: "ok"; receipt: Receipt };

function when(iso: string | null): string {
  if (!iso) return "Not recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not recorded";
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

/** Printable receipt for a paid order. Everything shown comes from the server record. */
export function ReceiptView({ orderId }: { orderId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    payFetch<Receipt>(`/api/pay/receipt?orderId=${encodeURIComponent(orderId)}`).then((res) => {
      if (!live) return;
      if (res.ok) setState({ kind: "ok", receipt: res.data });
      else if (res.status === 401) setState({ kind: "signin" });
      else if (res.status === 404) setState({ kind: "notfound" });
      else setState({ kind: "error", message: res.error });
    });
    return () => {
      live = false;
    };
  }, [orderId]);

  if (state.kind === "loading") return <div className="skeleton h-[32rem] rounded-[var(--r-lg)]" aria-busy="true" aria-label="Loading receipt" />;
  if (state.kind === "signin") {
    return <EmptyState icon={Lock} title="Sign in to view this receipt" description="Receipts are private to the account that paid." action={<Link className="btn btn-primary" href={`/login?next=/receipt/${orderId}`}>Sign in</Link>} />;
  }
  if (state.kind === "notfound") {
    return <EmptyState title="No receipt for this order" description="Receipts appear once a payment is confirmed. If you just paid, give it a minute and refresh." action={<Link className="btn" href={`/pay/${orderId}`}>Back to payment</Link>} />;
  }
  if (state.kind === "error") return <EmptyState tone="error" title="The receipt could not be loaded" description={state.message} action={<button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>} />;

  const r = state.receipt;
  return (
    <div className="space-y-4">
      <div className="pay-no-print flex flex-wrap items-center justify-between gap-3">
        <Link className="pay-link" href="/dashboard">Back to dashboard</Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Print or save as PDF
        </button>
      </div>

      <article className="pay-receipt card" aria-label={`Receipt ${r.receiptNo}`}>
        <header className="pay-receipt-head">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo-128.webp" alt="" width={44} height={44} className="rounded-xl" />
            <div className="min-w-0">
              <p className="font-display text-lg font-bold">CryptoGemCN</p>
              <p className="text-xs text-muted">Payment receipt</p>
            </div>
          </div>
          <span className="badge badge-up">Paid</span>
        </header>

        <dl className="pay-receipt-grid">
          <div><dt>Receipt number</dt><dd className="num">{r.receiptNo}</dd></div>
          <div><dt>Order</dt><dd className="num">{r.orderId.slice(0, 8)}</dd></div>
          <div><dt>Created</dt><dd>{when(r.createdAt)}</dd></div>
          <div><dt>Paid</dt><dd>{when(r.paidAt)}</dd></div>
        </dl>

        <section className="pay-receipt-section" aria-label="Item">
          <p className="eyebrow">{kindLabel(r.kind)}</p>
          <h1 className="h3 mt-2">{r.item.title}</h1>
          {r.item.lines.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-soft">
              {r.item.lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          )}
        </section>

        <section className="pay-receipt-section" aria-label="Payment">
          <div className="pay-receipt-total">
            <span className="text-sm text-muted">Total</span>
            <span className="num text-3xl font-bold">{formatUsd(r.priceUsd)}</span>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="pay-receipt-row"><dt>Paid in</dt><dd className="num">{formatAmount(r.payment.amount)} {r.payment.asset}</dd></div>
            <div className="pay-receipt-row"><dt>Network</dt><dd>{r.payment.networkLabel}</dd></div>
            <div className="pay-receipt-row"><dt>Received at</dt><dd className="num">{r.payment.toAddress}</dd></div>
            <div className="pay-receipt-row">
              <dt>Transaction</dt>
              <dd className="num">
                {r.payment.txHash ? r.payment.txHash : "Not recorded"}
                {r.payment.txHash && r.payment.explorerTxUrl && (
                  <a className="pay-inline-link pay-no-print mt-1" href={r.payment.explorerTxUrl} target="_blank" rel="noopener noreferrer">
                    View on explorer <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <footer className="pay-receipt-notes">
          <p>Payments are made in crypto directly between your wallet and ours and are confirmed on the network. Crypto transfers are final.</p>
          <p>The USD total is the order price. The crypto amount was fixed when the quote was created. Keep this receipt with your transaction hash for your records.</p>
          <p>This receipt is not a tax invoice. Questions? Contact support with the receipt number.</p>
        </footer>
      </article>
    </div>
  );
}
