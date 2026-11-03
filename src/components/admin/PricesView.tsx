"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { ACCESS, hasAnyRole } from "@/lib/admin/roles";
import { adminFetch, useAdminQuery } from "./api";
import { useAdmin } from "./AdminShell";
import { ConfirmDialog, Empty, fmtUsd, Loading, NONE, Notice, PageTitle } from "./ui";

type Table = "listing_packages" | "boost_packs" | "advertising_placements";
type Row = Record<string, unknown> & { id: string; name: string };
type Prices = Record<Table, Row[]>;

interface Field {
  key: string;
  label: string;
  kind: "usd" | "int" | "bool" | "text";
}

const FIELDS: Record<Exclude<Table, "advertising_placements">, Field[]> = {
  listing_packages: [
    { key: "price_usd", label: "Price (USD)", kind: "usd" },
    { key: "active", label: "Active", kind: "bool" },
  ],
  boost_packs: [
    { key: "price_usd", label: "Price (USD)", kind: "usd" },
    { key: "credits", label: "Credits", kind: "int" },
    { key: "duration_hours", label: "Duration (hours)", kind: "int" },
    { key: "active", label: "Active", kind: "bool" },
  ],
};

const TITLES: Record<Table, string> = { listing_packages: "Listing packages", boost_packs: "Boost packs", advertising_placements: "Advertising placements" };

/** Fields for a row. Placements edit one price per duration already present on the row. */
function fieldsFor(table: Table, row: Row): Field[] {
  if (table !== "advertising_placements") return FIELDS[table];
  const prices = (row.prices ?? {}) as Record<string, number>;
  const days = Object.keys(prices).sort((a, b) => Number(a) - Number(b));
  return [...days.map((d) => ({ key: `prices.${d}`, label: `${d} day${d === "1" ? "" : "s"} (USD)`, kind: "usd" as const })), { key: "active", label: "Active", kind: "bool" as const }];
}

const read = (row: Row, key: string): string | boolean => {
  if (key.startsWith("prices.")) return String(((row.prices ?? {}) as Record<string, number>)[key.slice(7)] ?? "");
  const v = row[key];
  return typeof v === "boolean" ? v : String(v ?? "");
};

export function PricesView() {
  const me = useAdmin();
  const { data, error, loading, reload } = useAdminQuery<Prices>("/api/admin/prices");
  return (
    <>
      <PageTitle title="Prices" hint="Changes apply to new orders at once. Existing orders keep the price they were created with. Every change is audited." />
      {loading && <Loading />}
      {!loading && error && <Notice tone="error">{error}</Notice>}
      {data &&
        (Object.keys(TITLES) as Table[]).map((t) => {
          const editable = hasAnyRole(me.roles, t === "advertising_placements" ? ACCESS.pricesPlacements : ACCESS.pricesCatalog);
          return (
            <section key={t} className="mb-8">
              <h2 className="mb-2 font-display text-lg font-bold">{TITLES[t]}</h2>
              {data[t].length === 0 ? <Empty title="No rows" /> : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {data[t].map((row) => <PriceCard key={`${t}:${row.id}:${JSON.stringify(row)}`} table={t} row={row} editable={editable} onSaved={reload} />)}
                </ul>
              )}
            </section>
          );
        })}
    </>
  );
}

function PriceCard({ table, row, editable, onSaved }: { table: Table; row: Row; editable: boolean; onSaved: () => void }) {
  const fields = fieldsFor(table, row);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string | boolean>>(() => Object.fromEntries(fields.map((f) => [f.key, read(row, f.key)])));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const changed = fields.filter((f) => draft[f.key] !== read(row, f.key));

  /** Build the PATCH body from the changed fields only. */
  function patch(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const prices: Record<string, number> = { ...((row.prices ?? {}) as Record<string, number>) };
    for (const f of changed) {
      const v = draft[f.key];
      if (f.key.startsWith("prices.")) prices[f.key.slice(7)] = Number(v);
      else out[f.key] = f.kind === "bool" ? v : f.kind === "text" ? v : Number(v);
    }
    if (changed.some((f) => f.key.startsWith("prices."))) out.prices = prices;
    return out;
  }

  async function save() {
    setBusy(true);
    setProblem(null);
    const res = await adminFetch("/api/admin/prices", { method: "PUT", body: { table, id: row.id, patch: patch() } });
    setBusy(false);
    if (!res.ok) return setProblem(res.error);
    setConfirm(false);
    setEditing(false);
    onSaved();
  }

  const show = (f: Field, v: string | boolean) => (f.kind === "bool" ? (v ? "Yes" : "No") : f.kind === "usd" ? (v === "" ? NONE : fmtUsd(Number(v))) : String(v) || NONE);

  return (
    <li className="card-flat min-w-0 space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold">{row.name}</p>
          <p className="text-xs text-muted">{row.id}</p>
        </div>
        {editable && !editing && (
          <button type="button" className="btn btn-sm" onClick={() => setEditing(true)} aria-label={`Edit ${row.name}`}>
            <Pencil size={15} /> Edit
          </button>
        )}
      </div>
      <dl className="space-y-2 text-sm">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <dt className="text-muted">{f.label}</dt>
            <dd className="min-w-0">
              {!editing ? show(f, read(row, f.key)) : f.kind === "bool" ? (
                <input type="checkbox" className="h-5 w-5" checked={draft[f.key] === true} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked })} aria-label={f.label} />
              ) : (
                <input className="input !min-h-11 !w-32 text-right" inputMode="decimal" value={String(draft[f.key] ?? "")} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} aria-label={f.label} />
              )}
            </dd>
          </div>
        ))}
      </dl>
      {editing && (
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary flex-1" disabled={changed.length === 0} onClick={() => { setProblem(null); setConfirm(true); }}>Review change</button>
          <button type="button" className="btn" onClick={() => { setEditing(false); setDraft(Object.fromEntries(fields.map((f) => [f.key, read(row, f.key)]))); }}>Cancel</button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title={`Update ${row.name}`}
        body={
          <ul className="space-y-1">
            {changed.map((f) => (
              <li key={f.key}>{f.label}: {show(f, read(row, f.key))} to <strong>{show(f, draft[f.key] ?? "")}</strong></li>
            ))}
          </ul>
        }
        confirmLabel="Save change"
        busy={busy}
        error={problem}
        onConfirm={() => void save()}
        onCancel={() => setConfirm(false)}
      />
    </li>
  );
}
