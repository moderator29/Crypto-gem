"use client";

import { ArrowRight, ExternalLink, FileText, Rocket } from "lucide-react";
import Link from "next/link";
import { formatAmount, formatUsd, shortHash } from "./payHelpers";
import { TrustLine } from "./payParts";
import type { PayIntent, Receipt } from "./types";

interface Props {
  orderId: string;
  kind: string;
  receipt: Receipt | null;
  receiptNo: string | null;
  intent: PayIntent | null;
  txHash: string | null;
  priceUsd: number;
}

/** Success state with an animated check and a receipt summary. Confetti is fired by the parent only for live completions. */
export function DoneState({ orderId, kind, receipt, receiptNo, intent, txHash, priceUsd }: Props) {
  const no = receipt?.receiptNo ?? receiptNo;
  const asset = receipt?.payment.asset ?? intent?.asset ?? null;
  const amount = receipt?.payment.amount ?? intent?.amount ?? null;
  const hash = receipt?.payment.txHash ?? txHash;
  const explorer = receipt?.payment.explorerTxUrl ?? null;
  const network = receipt?.payment.networkLabel ?? intent?.networkLabel ?? null;

  const rows: { label: string; value: string; mono?: boolean }[] = [];
  if (no) rows.push({ label: "Receipt number", value: no, mono: true });
  rows.push({ label: "Paid", value: formatUsd(receipt?.priceUsd ?? priceUsd) });
  if (asset && amount) rows.push({ label: "Amount sent", value: `${formatAmount(amount)} ${asset}`, mono: true });
  if (network) rows.push({ label: "Network", value: network });

  return (
    <div className="space-y-6 text-center">
      <div className="pay-done-badge fx-pop" aria-hidden="true">
        <svg viewBox="0 0 52 52" width="64" height="64">
          <circle className="pay-check-circle" cx="26" cy="26" r="23" fill="none" strokeWidth="3" />
          <path className="pay-check-path" d="M15 27.5l8 8 15-17" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="space-y-2" role="status">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Payment confirmed</h2>
        <p className="mx-auto max-w-sm text-sm text-soft">Thank you. Your order is paid and is now being put to work.</p>
      </div>

      <dl className="pay-receipt-mini text-left">
        {rows.map((r) => (
          <div key={r.label} className="pay-receipt-row">
            <dt>{r.label}</dt>
            <dd className={r.mono ? "num" : undefined}>{r.value}</dd>
          </div>
        ))}
        {hash && (
          <div className="pay-receipt-row">
            <dt>Transaction</dt>
            <dd className="num">
              {explorer ? (
                <a href={explorer} target="_blank" rel="noopener noreferrer" className="pay-inline-link">
                  {shortHash(hash, 10)} <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : (
                shortHash(hash, 10)
              )}
            </dd>
          </div>
        )}
      </dl>

      <div className="pay-actions pay-actions-center">
        <Link className="btn btn-primary btn-lg" href={`/receipt/${orderId}`}>
          <FileText size={18} /> View receipt
        </Link>
        {kind === "boost" && (
          <Link className="btn btn-lg" href="/dashboard/boosts">
            <Rocket size={18} /> View my boosts
          </Link>
        )}
        <Link className="btn btn-lg" href="/dashboard">
          Go to dashboard <ArrowRight size={18} />
        </Link>
      </div>
      <TrustLine className="justify-center" />
    </div>
  );
}
