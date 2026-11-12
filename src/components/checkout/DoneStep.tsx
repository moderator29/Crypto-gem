"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink, FileText, MessageCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { ReceiptData } from "@/lib/checkout/types";
import { SITE } from "@/lib/site";
import { formatUsd, receiptHref, receiptText, shortHash, when } from "./helpers";
import { CopyAction, useCopy } from "./parts";

/** Success screen: receipt summary and the next steps (an admin activates the order). */
export function DoneStep({ receipt, token, onNew }: { receipt: ReceiptData; token: string; onNew: () => void }) {
  const { copied, copy } = useCopy();
  const reduce = useReducedMotion();
  const href = receiptHref(token);
  const link = typeof window !== "undefined" ? `${window.location.origin}${href}` : null;
  const text = receiptText(receipt, link);
  const tgText = encodeURIComponent(`Hi, I paid for ${receipt.title}. Receipt ${receipt.number}. ${link ?? ""}`.trim());

  return (
    <div className="co-stack">
      <motion.div className="co-done-head" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <span className="co-done-badge" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle className="co-check-circle" cx="26" cy="26" r="23" strokeWidth="3" />
            <path className="co-check-path" d="M15 27l7 7 15-16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="co-done-title">Payment verified</h2>
        <p className="co-muted">Receipt <span className="num co-strong">{receipt.number}</span>. An admin activates your order shortly; message us to speed it up.</p>
      </motion.div>

      <dl className="co-mini">
        <div>
          <dt>Order</dt>
          <dd>{receipt.title}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd className="num">{formatUsd(receipt.priceUsd)}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd className="num">
            {receipt.received} {receipt.asset} on {receipt.networkLabel}
          </dd>
        </div>
        <div>
          <dt>Transaction</dt>
          <dd className="num">
            <a className="co-inline-link" href={receipt.explorerTxUrl} target="_blank" rel="noopener noreferrer">
              {shortHash(receipt.txHash)} <ExternalLink size={12} />
            </a>
          </dd>
        </div>
        <div>
          <dt>Confirmed</dt>
          <dd>{when(receipt.paidAt)}</dd>
        </div>
      </dl>

      <div className="co-actions">
        <Link className="btn btn-primary" href={href}>
          <FileText size={16} /> View receipt
        </Link>
        <CopyAction id="receipt" value={text} label="Copy receipt text" message="Receipt copied" copied={copied} onCopy={copy} />
      </div>

      <div className="co-glass-inner co-stack-sm">
        <p className="co-label">Message an admin on Telegram</p>
        <div className="co-actions">
          {SITE.admins.map((a) => (
            <a key={a.handle} className="btn" href={`${a.url}?text=${tgText}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} /> {a.label}
            </a>
          ))}
        </div>
      </div>

      <button type="button" className="co-link" onClick={onNew}>
        <RotateCcw size={14} /> Start a new checkout
      </button>
    </div>
  );
}
