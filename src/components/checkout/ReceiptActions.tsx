"use client";

import { ArrowLeft, MessageCircle, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReceiptData } from "@/lib/checkout/types";
import { SITE } from "@/lib/site";
import { receiptText } from "./helpers";
import { CopyAction, useCopy } from "./parts";

/** Print, copy and contact buttons above the receipt. Hidden when printing. */
export function ReceiptActions({ r }: { r: ReceiptData }) {
  const { copied, copy } = useCopy();
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => setLink(window.location.href), []);
  const admin = SITE.admins[0];
  return (
    <div className="co-no-print co-receipt-bar">
      <Link className="co-link" href="/checkout">
        <ArrowLeft size={14} /> Checkout
      </Link>
      <div className="co-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Print or save PDF
        </button>
        <CopyAction id="text" value={receiptText(r, link)} label="Copy text" message="Receipt copied" copied={copied} onCopy={copy} />
        {admin && (
          <a className="btn" href={`${admin.url}?text=${encodeURIComponent(`Receipt ${r.number} ${link ?? ""}`.trim())}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> {admin.label}
          </a>
        )}
      </div>
    </div>
  );
}
