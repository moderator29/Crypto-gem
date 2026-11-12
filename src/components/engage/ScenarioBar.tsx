"use client";

import { BookmarkPlus, FolderOpen, Link as LinkIcon, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import type { CalcInputs } from "@/components/tools/useCalcInputs";
import type { Values } from "@/lib/engage/params";
import { MAX_LABEL, type Scenario } from "@/lib/engage/scenarios";
import { useScenarios } from "@/lib/engage/useScenarios";
import { summarize, type SummaryLine } from "@/lib/tools/summaries";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const MAX_COMPARE = 3;

interface Column { key: string; title: string; lines: SummaryLine[] }

/** Side by side table of key results for the picked scenarios and the current inputs. */
function CompareTable({ columns }: { columns: Column[] }) {
  const labels: string[] = [];
  for (const c of columns) for (const l of c.lines) if (!labels.includes(l.label)) labels.push(l.label);
  if (labels.length === 0) return <p className="text-sm text-muted">These scenarios have no complete results to compare yet.</p>;
  return (
    <div className="fx-fade overflow-x-auto rounded-[var(--r-md)] border border-line">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="bg-[var(--surface-2)] text-xs text-muted">
            <th scope="col" className="px-3 py-2 font-semibold">Result</th>
            {columns.map((c) => <th key={c.key} scope="col" className="max-w-[140px] truncate px-3 py-2 font-semibold text-text">{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <tr key={label} className="border-t border-line">
              <th scope="row" className="px-3 py-2 text-xs font-medium text-muted">{label}</th>
              {columns.map((c) => <td key={c.key} className="num px-3 py-2 font-semibold">{c.lines.find((l) => l.label === label)?.text ?? "-"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Share link, save scenario and saved scenarios drawer for one calculator. Everything saved stays in this browser. */
export function ScenarioBar<D extends Values>({ calc }: { calc: CalcInputs<D> }) {
  const toast = useToast();
  const api = useScenarios(calc.slug, calc.spec, calc.defaults);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const labelId = useId();
  const now = useMemo(() => summarize(calc.slug, calc.values), [calc.slug, calc.values]);
  const columns: Column[] = [
    ...api.list.filter((s) => picked.includes(s.id)).map((s) => ({ key: s.id, title: s.label, lines: summarize(calc.slug, s.values) })),
    ...(picked.length > 0 && now.length > 0 ? [{ key: "now", title: "Now", lines: now }] : []),
  ];

  const share = async () => {
    try {
      await navigator.clipboard.writeText(calc.shareUrl());
      toast.success("Link copied", "Anyone who opens it sees these inputs. Nothing is stored on a server.");
    } catch {
      toast.error("Could not copy the link", "Copy the address from your browser bar after entering your numbers.");
    }
  };

  const save = () => {
    const r = api.save(label, calc.values);
    if (!r.ok) return setError(r.error);
    setError(null);
    setLabel("");
    toast.success("Scenario saved", `Kept on this device as "${r.saved.label}".`);
  };

  const load = (s: Scenario) => {
    calc.setValues(s.values);
    setOpen(false);
    toast.info("Scenario loaded", s.label);
  };

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_COMPARE ? p : [...p, id]));

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Share and save">
        <button type="button" className="btn btn-sm" onClick={share} disabled={!calc.dirty}><LinkIcon size={14} aria-hidden="true" /> Share this calculation</button>
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)} disabled={!calc.dirty}><BookmarkPlus size={14} aria-hidden="true" /> Save scenario</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}><FolderOpen size={14} aria-hidden="true" /> Saved <span className="num text-muted">({api.list.length}/{api.max})</span></button>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} variant="sheet" title="Saved scenarios" description="Kept only in this browser. Clearing site data removes them, and nobody else can see them.">
        <div className="space-y-5">
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <label htmlFor={labelId} className="text-[13px] font-semibold text-soft">Name this scenario</label>
            <div className="flex gap-2">
              <input id={labelId} className="input min-w-0 flex-1" maxLength={MAX_LABEL} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`Scenario ${api.list.length + 1}`} autoComplete="off" />
              <button type="submit" className="btn btn-primary btn-sm shrink-0" disabled={!calc.dirty || api.list.length >= api.max}>Save</button>
            </div>
            {!calc.dirty && <p className="text-xs text-muted">Enter some numbers first, then save them here.</p>}
            {error && <p role="alert" className="text-xs text-down">{error}</p>}
          </form>
          {api.list.length === 0 ? (
            <p className="rounded-[var(--r-md)] border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Nothing saved yet. Save a few what-ifs and compare them side by side.</p>
          ) : (
            <ul className="space-y-2">
              {api.list.map((s) => {
                const lines = summarize(calc.slug, s.values);
                const on = picked.includes(s.id);
                return (
                  <li key={s.id} className="row-in card-flat space-y-2 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{s.label}</p>
                        <p className="text-xs text-muted">{dateFmt.format(new Date(s.savedAt))}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button type="button" className="btn btn-sm" onClick={() => load(s)}>Load</button>
                        <button type="button" className="btn btn-icon btn-sm" aria-label={`Delete ${s.label}`} onClick={() => { api.remove(s.id); setPicked((p) => p.filter((x) => x !== s.id)); }}><Trash2 size={14} aria-hidden="true" /></button>
                      </div>
                    </div>
                    {lines.length > 0 && <p className="num text-xs text-soft">{lines.slice(0, 2).map((l) => `${l.label} ${l.text}`).join("  |  ")}</p>}
                    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs text-muted">
                      <input type="checkbox" checked={on} disabled={!on && picked.length >= MAX_COMPARE} onChange={() => toggle(s.id)} className="h-4 w-4 accent-[var(--brand)]" />
                      Compare{!on && picked.length >= MAX_COMPARE ? ` (up to ${MAX_COMPARE})` : ""}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {picked.length > 0 && <CompareTable columns={columns} />}
        </div>
      </Dialog>
    </>
  );
}
