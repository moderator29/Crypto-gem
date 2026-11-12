"use client";

import { ExternalLink, Loader2, RefreshCw, Search, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { ContactCard } from "@/components/ui/ContactCard";
import { CopyButton } from "@/components/ui/CopyButton";
import { adminFetch, useAdminQuery } from "./api";
import { Pager } from "./Pager";
import { DataTable, Empty, fmtDate, fmtUsd, Loading, NONE, Notice, PageTitle, StatusPill } from "./ui";

interface PaymentRow {
  id: string;
  order_id: string;
  provider: string;
  provider_payment_id: string | null;
  pay_currency: string;
  pay_network: string | null;
  pay_address: string | null;
  pay_amount: number;
  actually_paid: number | null;
  status: string;
  tx_hash: string | null;
  message: string | null;
  created_at: string;
  orders: { user_id: string | null; kind: string; price_usd: number; status: string } | null;
}

interface Wallet { address: string; family: "evm" | "solana"; networks: string[] }
interface Resp { items: PaymentRow[]; total: number; wallets: Wallet[]; canWrite: boolean; explorer: { tx: Record<string, string>; address: Record<string, string> } }
type Action = "verify" | "mark_paid" | "reject";

const STATUSES = ["created", "waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "expired", "refunded"];
const OPEN = ["created", "waiting", "confirming", "confirmed", "sending", "partially_paid"];
const KINDS = ["listing", "ad_campaign", "boost"];
const LIMIT = 25;

/** Asset and network of a direct payment. The method id is "<asset>-<network>", for example usdt-bsc. */
const assetOf = (r: PaymentRow) => r.pay_currency.split("-")[0]!.toUpperCase();
const shortHash = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

function TxLink({ row, explorer }: { row: PaymentRow; explorer: Resp["explorer"] }) {
  if (!row.tx_hash) return <>{NONE}</>;
  const base = row.pay_network ? explorer.tx[row.pay_network] : undefined;
  if (!base) return <span className="num break-all text-xs">{shortHash(row.tx_hash)}</span>;
  return (
    <a href={`${base}${row.tx_hash}`} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-semibold text-brand hover:underline">
      <span className="num truncate text-xs">{shortHash(row.tx_hash)}</span><ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

/** Support view of every payment. Direct payments show asset, network, amount, hash and carry the audited verify, mark-paid and reject actions. */
export function PaymentsView() {
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [provider, setProvider] = useState("direct");
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [dialog, setDialog] = useState<{ row: PaymentRow; action: "mark_paid" | "reject" } | null>(null);
  const [reason, setReason] = useState("");
  const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
  if (status) params.set("status", status);
  if (kind) params.set("kind", kind);
  if (provider) params.set("provider", provider);
  if (q) params.set("q", q);
  const { data, error, loading, reload } = useAdminQuery<Resp>(`/api/admin/payments?${params}`);

  async function run(row: PaymentRow, action: Action, why?: string) {
    setBusy(`${row.id}:${action}`);
    setNote(null);
    const res = await adminFetch<{ result?: { status?: string; message?: string | null } }>("/api/admin/payments/action", { method: "POST", body: { paymentId: row.id, action, reason: why } });
    setBusy(null);
    if (!res.ok) return setNote({ tone: "error", text: res.error ?? "The action failed." });
    const r = res.data?.result;
    setNote({ tone: "ok", text: action === "verify" ? `Checked on chain. Status is now ${(r?.status ?? "unchanged").replaceAll("_", " ")}.${r?.message ? ` ${r.message}` : ""}` : action === "mark_paid" ? "Marked paid and fulfilled. The action is in the audit log." : "Payment rejected. The action is in the audit log." });
    setDialog(null);
    setReason("");
    reload();
  }

  const reasonOk = reason.trim().length >= 10;

  return (
    <>
      <PageTitle title="Payments" hint="Direct on-chain payments. The chain is the source of truth. Manual actions need a written reason and are audited." />

      {data && (
        <section className="card mb-4 min-w-0 space-y-3 p-4" aria-label="Receiving wallets">
          <h2 className="flex items-center gap-2 text-sm font-bold"><Wallet size={16} className="text-brand" aria-hidden="true" /> Receiving wallets</h2>
          <ul className="space-y-2">
            {data.wallets.map((w) => {
              const base = data.explorer.address[w.family === "solana" ? "solana" : "ethereum"];
              return (
                <li key={w.address} className="card-flat min-w-0 space-y-2 p-3">
                  <p className="text-xs text-muted">{w.networks.join(", ")}</p>
                  <div className="admin-addr">
                    <code className="num">{w.address}</code>
                    <CopyButton value={w.address} what="Address copied" />
                    {base && <a className="btn btn-sm" href={`${base}${w.address}`} target="_blank" rel="noopener noreferrer" aria-label="Open in explorer"><ExternalLink size={14} /></a>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <form className="mb-4 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto]" onSubmit={(e) => { e.preventDefault(); setQ(draftQ.trim()); setOffset(0); }}>
        <select className="input w-full min-w-0" aria-label="Provider" value={provider} onChange={(e) => { setProvider(e.target.value); setOffset(0); }}>
          <option value="direct">Direct crypto</option>
          <option value="nowpayments">NOWPayments (legacy)</option>
          <option value="">Any provider</option>
        </select>
        <select className="input w-full min-w-0" aria-label="Payment status" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">Any status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
        </select>
        <select className="input w-full min-w-0" aria-label="Product" value={kind} onChange={(e) => { setKind(e.target.value); setOffset(0); }}>
          <option value="">Any product</option>
          {KINDS.map((k) => <option key={k} value={k}>{k.replaceAll("_", " ")}</option>)}
        </select>
        <input className="input w-full min-w-0 sm:col-span-2 lg:col-span-1" aria-label="Order id or provider payment id" placeholder="Exact order id or payment id" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} />
        <button className="btn btn-primary"><Search size={16} /> Search</button>
      </form>

      {note && <div className="mb-4"><Notice tone={note.tone}>{note.text}</Notice></div>}
      {loading && <Loading />}
      {!loading && error && <Notice tone="error">{error}</Notice>}
      {data && data.items.length === 0 && <Empty title="No payments" hint="Nothing matches these filters." />}
      {data && data.items.length > 0 && (
        <>
          <DataTable
            rows={data.items}
            rowKey={(r) => r.id}
            columns={[
              { key: "p", label: "Payment", primary: true, render: (r) => <span className="num">{r.provider_payment_id ?? r.id.slice(0, 8)}</span> },
              { key: "k", label: "Product", render: (r) => (r.orders ? `${r.orders.kind.replaceAll("_", " ")} ${fmtUsd(r.orders.price_usd)}` : NONE) },
              { key: "as", label: "Asset", render: (r) => (r.provider === "direct" ? assetOf(r) : r.pay_currency) },
              { key: "n", label: "Network", render: (r) => r.pay_network ?? NONE },
              { key: "c", label: "Amount", render: (r) => <span className="num">{r.pay_amount}{r.actually_paid !== null ? ` (got ${r.actually_paid})` : ""}</span> },
              { key: "h", label: "Tx hash", render: (r) => <TxLink row={r} explorer={data.explorer} /> },
              { key: "s", label: "Status", render: (r) => <span className="inline-flex flex-col items-end gap-1 md:items-start"><StatusPill value={r.status} />{r.message && <span className="max-w-[16rem] text-xs text-muted">{r.message}</span>}</span> },
              { key: "o", label: "Order", render: (r) => <span className="num break-all text-xs">{r.order_id}</span> },
              { key: "u", label: "User", render: (r) => <span className="num break-all text-xs">{r.orders?.user_id ?? NONE}</span> },
              { key: "t", label: "Created", render: (r) => fmtDate(r.created_at) },
              {
                key: "a",
                label: "Actions",
                render: (r) => {
                  if (r.provider !== "direct" || !OPEN.includes(r.status)) return NONE;
                  const verifying = busy === `${r.id}:verify`;
                  return (
                    <span className="flex flex-wrap justify-end gap-1.5 md:justify-start">
                      <button type="button" className="btn btn-sm" disabled={busy !== null} onClick={() => void run(r, "verify")}>{verifying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Verify now</button>
                      {data.canWrite && <button type="button" className="btn btn-sm btn-primary" disabled={busy !== null} onClick={() => { setReason(""); setDialog({ row: r, action: "mark_paid" }); }}><ShieldCheck size={14} /> Mark paid</button>}
                      {data.canWrite && <button type="button" className="btn btn-sm" disabled={busy !== null} onClick={() => { setReason(""); setDialog({ row: r, action: "reject" }); }}>Reject</button>}
                    </span>
                  );
                },
              },
            ]}
          />
          <Pager offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />
        </>
      )}

      <div className="mt-6"><ContactCard title="Support contacts" note="Buyers who paid but see no confirmation will message these admins. Use the order id to find their payment here." /></div>

      <Dialog
        open={dialog !== null}
        onClose={() => (busy ? undefined : setDialog(null))}
        variant="sheet"
        title={dialog?.action === "mark_paid" ? "Mark this payment as paid" : "Reject this payment"}
        description={dialog ? `${dialog.row.pay_amount} ${assetOf(dialog.row)} on ${dialog.row.pay_network ?? "unknown network"}. Order ${dialog.row.order_id}.` : undefined}
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <button type="button" className="btn" disabled={busy !== null} onClick={() => setDialog(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={!reasonOk || busy !== null} onClick={() => dialog && void run(dialog.row, dialog.action, reason.trim())}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : null} {dialog?.action === "mark_paid" ? "Mark paid and fulfil" : "Reject payment"}
            </button>
          </div>
        }
      >
        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-semibold">Reason (required, saved in the audit log)</span>
          <textarea className="input min-h-24 w-full min-w-0" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: confirmed the transfer on the explorer, hash 0x..., buyer sent from a custodial wallet." />
          <span className={`mt-1 block text-xs ${reasonOk ? "text-up" : "text-muted"}`}>{reason.trim().length}/500, at least 10 characters</span>
        </label>
        {dialog?.action === "mark_paid" && <p className="mt-3 text-xs text-muted">The order is marked paid exactly once and the product is fulfilled. Check the transfer on the explorer first.</p>}
      </Dialog>
    </>
  );
}
