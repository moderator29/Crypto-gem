"use client";

import { ArrowLeft, Check, MessageSquarePlus, Pause, Rocket, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { compareSubmission, type Verdict } from "@/lib/admin/compare";
import { ACCESS, hasAnyRole } from "@/lib/admin/roles";
import { actionsFor, TRANSITIONS, type ListingAction } from "@/lib/admin/transitions";
import { adminFetch, useAdminQuery } from "./api";
import { useAdmin } from "./AdminShell";
import { ConfirmDialog, DataTable, Empty, fmtDate, fmtUsd, Loading, NONE, Notice, PageTitle, StatusPill } from "./ui";

interface Detail {
  submission: Record<string, unknown> & { id: string; status: string; name: string; symbol: string; owner_id: string };
  notes: Array<{ id: string; author: string; kind: string; note: string; created_at: string }>;
  orders: Array<{ id: string; status: string; price_usd: number; created_at: string; paid_at: string | null }>;
}

const VERDICT: Record<Verdict, { text: string; tone: string }> = {
  match: { text: "Matches", tone: "text-up" },
  differs: { text: "Differs", tone: "text-down" },
  owner_only: { text: "Not detected", tone: "text-warm" },
  detected_only: { text: "Owner left blank", tone: "text-warm" },
  both_empty: { text: NONE, tone: "text-muted" },
};

const BUTTON: Record<Exclude<ListingAction, "note">, { label: string; icon: typeof Check; danger?: boolean; confirm: string; body: string }> = {
  approve: { label: "Approve", icon: Check, confirm: "Approve listing", body: "The owner's listing moves to approved. It is not public until you publish it." },
  reject: { label: "Reject", icon: X, danger: true, confirm: "Reject listing", body: "The listing is rejected and the reason is recorded. The owner can see it." },
  request_changes: { label: "Request changes", icon: Undo2, confirm: "Request changes", body: "The listing returns to draft so the owner can edit and resubmit. Say exactly what to fix." },
  publish: { label: "Publish", icon: Rocket, confirm: "Publish listing", body: "The listing becomes public. A paid order must exist." },
  suspend: { label: "Suspend", icon: Pause, danger: true, confirm: "Suspend listing", body: "The listing is removed from public view immediately. Publish again to reinstate it." },
};

const isHttp = (v: string) => /^https?:\/\//i.test(v);

export function ListingDetail({ id }: { id: string }) {
  const me = useAdmin();
  const { data, error, loading, reload } = useAdminQuery<Detail>(`/api/admin/listings?id=${encodeURIComponent(id)}`);
  const [pending, setPending] = useState<ListingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const canWrite = hasAnyRole(me.roles, ACCESS.listingsWrite);

  async function run(action: ListingAction, reason: string) {
    setBusy(true);
    setProblem(null);
    const res = await adminFetch("/api/admin/listings", { method: "POST", body: { id, action, ...(reason ? { reason } : {}) } });
    setBusy(false);
    if (!res.ok) return setProblem(res.error);
    setPending(null);
    reload();
  }

  return (
    <>
      <Link href="/admin/listings" className="mb-3 inline-flex items-center gap-1.5 text-sm text-soft hover:text-text">
        <ArrowLeft size={15} /> Back to queue
      </Link>
      {loading && <Loading />}
      {!loading && error && <Notice tone="error">{error}</Notice>}
      {data && <Body data={data} canWrite={canWrite} onAction={(a) => { setProblem(null); setPending(a); }} />}
      {data && pending && (
        <ConfirmDialog
          open
          title={pending === "note" ? "Add a note" : BUTTON[pending].confirm}
          body={pending === "note" ? "Visible to staff only. The status does not change." : BUTTON[pending].body}
          confirmLabel={pending === "note" ? "Save note" : BUTTON[pending].confirm}
          reasonLabel={pending === "note" ? "Note" : TRANSITIONS[pending].reasonRequired ? "Reason" : "Note (optional)"}
          reasonRequired={TRANSITIONS[pending].reasonRequired}
          danger={pending !== "note" && BUTTON[pending].danger}
          busy={busy}
          error={problem}
          onConfirm={(reason) => void run(pending, reason)}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

function Body({ data, canWrite, onAction }: { data: Detail; canWrite: boolean; onAction: (a: ListingAction) => void }) {
  const s = data.submission;
  const { rows, hasSnapshot } = compareSubmission(s);
  const actions = canWrite ? actionsFor(s.status) : [];
  const reason = typeof s.rejection_reason === "string" ? s.rejection_reason : null;
  return (
    <>
      <PageTitle title={`${s.name} (${s.symbol})`} hint={`Submitted ${fmtDate(String(s.created_at))}. Owner ${String(s.owner_id).slice(0, 8)}.`}>
        <StatusPill value={s.status} />
      </PageTitle>

      {canWrite ? (
        <div className="mb-5 flex flex-wrap gap-2">
          {actions.map((a) => {
            const b = BUTTON[a as Exclude<ListingAction, "note">];
            return (
              <button key={a} type="button" className={`btn ${a === "approve" || a === "publish" ? "btn-primary" : ""}`} onClick={() => onAction(a)}>
                <b.icon size={16} /> {b.label}
              </button>
            );
          })}
          <button type="button" className="btn" onClick={() => onAction("note")}>
            <MessageSquarePlus size={16} /> Add note
          </button>
          {actions.length === 0 && <p className="self-center text-sm text-muted">No review action is available while the listing is {s.status.replaceAll("_", " ")}.</p>}
        </div>
      ) : (
        <div className="mb-5"><Notice>Your role can read listings but not change them.</Notice></div>
      )}
      {reason && <div className="mb-5"><Notice>Last reason on record: {reason}</Notice></div>}

      <h2 className="mb-2 font-display text-lg font-bold">Submitted versus detected</h2>
      {!hasSnapshot && <div className="mb-3"><Notice>No detection snapshot is stored for this submission, so nothing can be cross-checked automatically. Verify the contract and links by hand.</Notice></div>}
      <DataTable
        rows={rows}
        rowKey={(r) => r.field}
        columns={[
          { key: "f", label: "Field", primary: true, render: (r) => r.field },
          { key: "o", label: "Submitted", render: (r) => <Value v={r.owner} /> },
          { key: "d", label: "Detected", render: (r) => (r.detected ? <><Value v={r.detected} />{r.source && <span className="block text-xs text-muted">via {r.source}</span>}</> : NONE) },
          { key: "v", label: "Result", render: (r) => <span className={`text-xs font-semibold ${VERDICT[r.verdict].tone}`}>{VERDICT[r.verdict].text}</span> },
        ]}
      />

      <h2 className="mb-2 mt-6 font-display text-lg font-bold">Payment</h2>
      {data.orders.length === 0 ? (
        <Empty title="No order" hint="This submission has no listing order, so it cannot be published." />
      ) : (
        <DataTable
          rows={data.orders}
          rowKey={(r) => r.id}
          columns={[
            { key: "o", label: "Order", primary: true, render: (r) => r.id.slice(0, 8) },
            { key: "p", label: "Price", render: (r) => fmtUsd(r.price_usd) },
            { key: "s", label: "Status", render: (r) => <StatusPill value={r.status} /> },
            { key: "t", label: "Paid", render: (r) => fmtDate(r.paid_at) },
          ]}
        />
      )}

      <h2 className="mb-2 mt-6 font-display text-lg font-bold">Reviewer notes</h2>
      {data.notes.length === 0 ? (
        <Empty title="No notes yet" />
      ) : (
        <ul className="space-y-3">
          {data.notes.map((n) => (
            <li key={n.id} className="glass-flat min-w-0 space-y-1 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>{n.kind.replaceAll("_", " ")} by {n.author.slice(0, 8)}</span>
                <span>{fmtDate(n.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words">{n.note}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Value({ v }: { v: string | null }) {
  if (!v) return <span>{NONE}</span>;
  if (isHttp(v)) return <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-brand hover:underline">{v}</a>;
  return <span className="break-words">{v}</span>;
}
