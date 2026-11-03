"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useAdminQuery } from "./api";
import { Pager } from "./Pager";
import { DataTable, Empty, fmtDate, Loading, NONE, Notice, PageTitle } from "./ui";

interface Entry {
  id: number;
  actor_id: string | null;
  action: string;
  target: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
}

const LIMIT = 50;

export function AuditView() {
  const [draft, setDraft] = useState("");
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
  if (action) params.set("action", action);
  const { data, error, loading } = useAdminQuery<{ items: Entry[]; total: number }>(`/api/admin/audit?${params}`);

  return (
    <>
      <PageTitle title="Audit log" hint="Every admin change, newest first. Entries cannot be edited or deleted." />
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setAction(draft.trim()); setOffset(0); }}>
        <input className="input" aria-label="Exact action" placeholder="Exact action, e.g. listing.approve" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn btn-primary shrink-0" aria-label="Filter"><Search size={16} /></button>
      </form>
      {loading && <Loading />}
      {!loading && error && <Notice tone="error">{error}</Notice>}
      {data && data.items.length === 0 && <Empty title="No entries" hint="Nothing has been logged yet, or nothing matches the filter." />}
      {data && data.items.length > 0 && (
        <>
          <DataTable
            rows={data.items}
            rowKey={(r) => String(r.id)}
            columns={[
              { key: "a", label: "Action", primary: true, render: (r) => r.action },
              { key: "t", label: "When", render: (r) => fmtDate(r.created_at) },
              { key: "w", label: "Actor", render: (r) => (r.actor_id ? r.actor_id.slice(0, 8) : NONE) },
              { key: "g", label: "Target", render: (r) => <span className="break-all text-xs">{r.target ?? NONE}</span> },
              { key: "d", label: "Change", render: (r) => <Diff before={r.before} after={r.after} /> },
            ]}
          />
          <Pager offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />
        </>
      )}
    </>
  );
}

function Diff({ before, after }: { before: unknown; after: unknown }) {
  if (before == null && after == null) return <span>{NONE}</span>;
  return (
    <details className="text-left">
      <summary className="cursor-pointer text-brand">View</summary>
      <pre className="mt-2 max-w-full whitespace-pre-wrap break-all rounded-md bg-[var(--border)] p-2 text-xs">{JSON.stringify({ before, after }, null, 2)}</pre>
    </details>
  );
}
