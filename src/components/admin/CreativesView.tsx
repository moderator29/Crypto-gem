"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { adminFetch, useAdminQuery } from "./api";
import { ConfirmDialog, Empty, fmtDate, Loading, NONE, Notice, PageTitle } from "./ui";

interface Creative {
  id: string;
  variant: string;
  storage_path: string;
  width: number;
  height: number;
  advertising_campaigns: { placement_id: string; headline: string | null; destination_url: string; starts_at: string; ends_at: string; status: string } | null;
}

export function CreativesView() {
  const { data, error, loading, reload } = useAdminQuery<{ items: Creative[] }>("/api/admin/creatives");
  const [pick, setPick] = useState<{ creative: Creative; decision: "approve" | "reject" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function decide(note: string) {
    if (!pick) return;
    setBusy(true);
    setProblem(null);
    const res = await adminFetch("/api/admin/creatives", { method: "POST", body: { id: pick.creative.id, decision: pick.decision, ...(note ? { note } : {}) } });
    setBusy(false);
    if (!res.ok) return setProblem(res.error);
    setPick(null);
    reload();
  }

  return (
    <>
      <PageTitle title="Creatives" hint="Ad creatives waiting for review. Reject with a note the advertiser can act on." />
      {loading && <Loading />}
      {!loading && error && <Notice tone="error">{error}</Notice>}
      {data && data.items.length === 0 && <Empty title="Nothing to review" hint="No creatives are pending. Creative upload is not live yet, so this stays empty until advertisers can submit artwork." />}
      {data && data.items.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.items.map((c) => (
            <li key={c.id} className="card-flat min-w-0 space-y-3 p-4">
              <div>
                <p className="break-words font-semibold">{c.advertising_campaigns?.headline ?? "No headline"}</p>
                <p className="text-xs text-muted">{c.advertising_campaigns?.placement_id ?? NONE} / {c.variant} / {c.width}x{c.height}</p>
              </div>
              <dl className="space-y-1 text-sm">
                <Line k="Destination" v={c.advertising_campaigns?.destination_url ? <a href={c.advertising_campaigns.destination_url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-brand hover:underline">{c.advertising_campaigns.destination_url}</a> : NONE} />
                <Line k="Runs" v={c.advertising_campaigns ? `${fmtDate(c.advertising_campaigns.starts_at)} to ${fmtDate(c.advertising_campaigns.ends_at)}` : NONE} />
                <Line k="File" v={<span className="break-all text-xs">{c.storage_path}</span>} />
              </dl>
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary flex-1" onClick={() => { setProblem(null); setPick({ creative: c, decision: "approve" }); }}><Check size={16} /> Approve</button>
                <button type="button" className="btn flex-1" onClick={() => { setProblem(null); setPick({ creative: c, decision: "reject" }); }}><X size={16} /> Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={pick !== null}
        title={pick?.decision === "approve" ? "Approve creative" : "Reject creative"}
        body="The decision is recorded in the audit log."
        confirmLabel={pick?.decision === "approve" ? "Approve" : "Reject"}
        reasonLabel={pick?.decision === "approve" ? "Note (optional)" : "Reason for the advertiser"}
        reasonRequired={pick?.decision === "reject"}
        danger={pick?.decision === "reject"}
        busy={busy}
        error={problem}
        onConfirm={(note) => void decide(note)}
        onCancel={() => setPick(null)}
      />
    </>
  );
}

function Line({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className="min-w-0 break-words text-right">{v}</dd>
    </div>
  );
}
