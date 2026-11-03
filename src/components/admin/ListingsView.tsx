"use client";

import Link from "next/link";
import { useState } from "react";
import { ageShort, shortAddress } from "@/lib/utils/format";
import { useAdminQuery } from "./api";
import { Pager } from "./Pager";
import { DataTable, Empty, Loading, NONE, Notice, PageTitle, StatusPill } from "./ui";

export interface QueueRow {
  id: string;
  name: string;
  symbol: string;
  network_id: string | null;
  address: string | null;
  status: string;
  updated_at: string;
}

const FILTERS = [
  { id: "review", label: "Needs review", status: "submitted,pending_review" },
  { id: "approved", label: "Approved", status: "approved" },
  { id: "published", label: "Published", status: "published" },
  { id: "suspended", label: "Suspended", status: "suspended" },
  { id: "rejected", label: "Rejected", status: "rejected" },
  { id: "all", label: "All", status: "all" },
] as const;

const LIMIT = 25;

export function ListingsView() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("review");
  const [offset, setOffset] = useState(0);
  const status = FILTERS.find((f) => f.id === filter)!.status;
  const { data, error, loading } = useAdminQuery<{ items: QueueRow[]; total: number }>(`/api/admin/listings?status=${status}&limit=${LIMIT}&offset=${offset}`);

  return (
    <>
      <PageTitle title="Listings" hint="Oldest first, so nothing waits forever." />
      <div className="scroll-x -mx-4 mb-4 px-4" role="group" aria-label="Status filter">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip shrink-0" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setOffset(0); }}>
            {f.label}
          </button>
        ))}
      </div>
      {loading && <Loading />}
      {!loading && error && <Notice tone="error">{error}</Notice>}
      {data && data.items.length === 0 && <Empty title="Nothing here" hint="No submissions match this filter right now." />}
      {data && data.items.length > 0 && (
        <>
          <DataTable
            rows={data.items}
            rowKey={(r) => r.id}
            columns={[
              { key: "token", label: "Token", primary: true, render: (r) => <Link href={`/admin/listings/${r.id}`} className="text-brand hover:underline">{r.name} <span className="text-muted">{r.symbol}</span></Link> },
              { key: "chain", label: "Contract", render: (r) => (r.address ? `${r.network_id ?? NONE} ${shortAddress(r.address)}` : NONE) },
              { key: "status", label: "Status", render: (r) => <StatusPill value={r.status} /> },
              { key: "updated", label: "Updated", render: (r) => ageShort(r.updated_at) },
            ]}
          />
          <Pager offset={offset} limit={LIMIT} total={data.total} onChange={setOffset} />
        </>
      )}
    </>
  );
}
