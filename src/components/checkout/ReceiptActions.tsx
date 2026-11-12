"use client";

import { ArrowLeft, Check, Copy, MessageCircle, Printer } from "lucide-react";
import Link from "next/link";
import type { ReceiptData } from "@/lib/checkout/types";
import { SITE } from "@/lib/site";
import { receiptText } from "./helpers";
import { useCopy } from "./parts";

/** Print, copy and contact buttons above the receipt. Hidden when printing. */
export function ReceiptActions({ r }: { r: ReceiptData }) {
  const { copied, copy } = useCopy();
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
        <button type="button" className="btn co-nowrap" onClick={() => copy("text", receiptText(r, window.location.href), "Receipt copied")}>
          {copied === "text" ? <Check size={16} /> : <Copy size={16} />} {copied === "text" ? "Copied" : "Copy text"}
        </button>
        {admin && (
          <a className="btn" href={`${admin.url}?text=${encodeURIComponent(`Hi, I paid for ${r.title}. Receipt ${r.number}.`)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> {admin.label}
          </a>
        )}
      </div>
    </div>
  );
}
