"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useAdminQuery } from "./api";
import { Pager } from "./Pager";
import { DataTable, Empty, fmtDate, fmtUsd, Loading, NONE, Notice, PageTitle, StatusPill } from "./ui";

interface PaymentRow {
  id: string;
  order_id: string;
  provider_payment_id: string | null;
  pay_currency: string;
  pay_network: string | null;
  pay_amount: number;
  actually_paid: number | null;
  status: string;
  tx_hash: string | null;
  created_at: string;
  orders: { kind: string; price_usd: number; status: string } | null;
}

const STATUSES = ["created", "waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "expired", "refunded"];
const KINDS = ["listing", "ad_campaign", "boost"];
const LIMIT = 25;

export function PaymentsView() {
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
  if (status) params.set("status", status);
  if (kind) params.set("kind", kind);
  if (q) params.set("q", q);
  const { data, error, loading } = useAdminQuery<{ items: PaymentRow[]; total: number }>(`/api/admin/payments?${params}`);

  return (
    <>
      <PageTitle title="Payments" hint="Read only. Provider status is the source of truth for whether money arrived." />
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]" onSubmit={(e) => { e.preventDefault(); setQ(draftQ.trim()); setOffset(0); }}>
        <select className="input" aria-label="Payment status" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
        </select>
        <select className="input" aria-label="Product" value={kind} onChange={(e) => { setKind(e.target.value); setOffset(0); }}>
          <option value="">Any product</option>
          {KINDS.map((k) => <option key={k} value={k}>{k.replaceAll("_", " ")}</option>)}
        </select>
        <input className="input" aria-label="Order id or provider payment id" placeholder="Exact order id or provider payment id" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} />
        <button className="btn btn-primary"><Search size={16} /> Search</button>
      </form>
      {loading && <Loading />}
      {!loading && error && <Notice tone="error">{error}</Notice>}
      {data && data.items.length === 0 && <Empty title="No payments" hint="Nothing matches these filters." />}
      {data && data.items.length > 0 && (
        <>
          <DataTable
            rows={data.items}
            rowKey={(r) => r.id}
            columns={[
              { key: "p", label: "Payment", primary: true, render: (r) => r.provider_payment_id ?? r.id.slice(0, 8) },
              { key: "k", label: "Product", render: (r) => (r.orders ? `${r.orders.kind.replaceAll("_", " ")} ${fmtUsd(r.orders.price_usd)}` : NONE) },
              { key: "c", label: "Pay with", render: (r) => `${r.pay_amount} ${r.pay_currency}${r.pay_network ? ` (${r.pay_network})` : ""}` },
              { key: "a", label: "Received", render: (r) => (r.actually_paid === null ? NONE : String(r.actually_paid)) },
              { key: "s", label: "Status", render: (r) => <StatusPill value={r.status} /> },
              { key: "o", label: "Order", render: (r) => <span className="break-all text-xs">{r.order_id}</span> },
              { key: "t", label: "Created", render: (r) => fmtDate(r.created_at) },
            ]}
          />
          <Pager offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />
        </>
      )}
    </>
  );
}
