"use client";

import { AlertTriangle, Inbox, Loader2, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

/** The only place an em-dash appears: a cell with no value. */
export const NONE = "—";

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return NONE;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? NONE : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export const fmtUsd = (n: number | string | null | undefined): string => {
  const v = Number(n);
  return n === null || n === undefined || !Number.isFinite(v) ? NONE : v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
};

export function PageTitle({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {hint && <p className="mt-1 text-sm text-soft">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) {
  const color = tone === "error" ? "text-down" : tone === "ok" ? "text-up" : "text-warm";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`card-flat flex items-start gap-2 p-3 text-sm ${color}`}>
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card-flat flex flex-col items-center gap-2 p-8 text-center">
      <Inbox size={26} className="text-muted" />
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-md text-sm text-soft">{hint}</p>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-16" />
      <div className="skeleton h-16" />
      <div className="skeleton h-16" />
    </div>
  );
}

const PILL: Record<string, string> = {
  published: "text-up", approved: "text-up", finished: "text-up", paid: "text-up", active: "text-up", enabled: "text-up",
  rejected: "text-down", failed: "text-down", expired: "text-down", suspended: "text-down", refunded: "text-down", cancelled: "text-down",
  pending_review: "text-warm", submitted: "text-warm", pending: "text-warm", waiting: "text-warm", confirming: "text-warm", partially_paid: "text-warm",
};

export function StatusPill({ value }: { value: string }) {
  return <span className={`inline-flex items-center rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-semibold ${PILL[value] ?? "text-soft"}`}>{value.replaceAll("_", " ")}</span>;
}

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  /** The card title on mobile. One per table. */
  primary?: boolean;
}

/** A table from md up. On phones each row is a stacked card, so the page never scrolls sideways. */
export function DataTable<T>({ columns, rows, rowKey }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string }) {
  const primary = columns.find((c) => c.primary) ?? columns[0]!;
  const rest = columns.filter((c) => c !== primary);
  return (
    <>
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-0 text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-line last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="max-w-[18rem] break-words px-4 py-3 align-top">{c.render(r)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="card-flat min-w-0 space-y-2 p-4">
            <div className="min-w-0 break-words font-semibold">{primary.render(r)}</div>
            {rest.map((c) => (
              <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                <span className="shrink-0 text-muted">{c.label}</span>
                <span className="min-w-0 break-words text-right">{c.render(r)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Confirmation sheet. When `reasonLabel` is set a reason of at least 3 characters is required before
 * the confirm button enables. Bottom sheet on phones, centred dialog from sm up.
 */
export function ConfirmDialog(props: DialogProps) {
  return props.open ? <DialogBody {...props} /> : null;
}

interface DialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function DialogBody({
  title, body, confirmLabel, reasonLabel, reasonRequired = true, danger, busy, error, onConfirm, onCancel,
}: DialogProps) {
  const [reason, setReason] = useState("");
  const id = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const valid = !reasonLabel || !reasonRequired || reason.trim().length >= 3;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => !busy && onCancel()} />
      <div className="glass-float relative w-full max-w-md space-y-4 !rounded-b-none !bg-[var(--surface-1)] p-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:!rounded-b-[var(--r-lg)]">
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-t`} className="font-display text-lg font-bold">{title}</h2>
          <button type="button" className="btn btn-icon btn-sm" aria-label="Close" onClick={onCancel} disabled={busy}>
            <X size={16} />
          </button>
        </div>
        {body && <div className="text-sm text-soft">{body}</div>}
        {reasonLabel && (
          <label className="block space-y-1.5 text-sm font-semibold">
            {reasonLabel}
            <textarea autoFocus className="input !min-h-24 !py-3" maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={reasonRequired ? "Required" : "Optional"} />
          </label>
        )}
        {error && <p className="text-sm text-down" role="alert">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${danger ? "!border-transparent !bg-[var(--down)] !text-white" : "btn-primary"}`} disabled={busy || !valid} onClick={() => onConfirm(reason.trim())}>
            {busy && <Loader2 size={16} className="animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
