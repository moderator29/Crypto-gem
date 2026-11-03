"use client";

import { useEffect, useState } from "react";
import { NavIcon } from "@/components/ui/NavIcon";

interface Report { flags: Array<{ level: "high" | "medium" | "info"; label: string }>; holders: number | null; buyTax: number | null; sellTax: number | null; checked: number }
type State = { s: "loading" } | { s: "none" } | { s: "error" } | { s: "ok"; r: Report };

const TONE = { high: "bg-down", medium: "bg-warm", info: "bg-brand" } as const;

/** Token security readout from GoPlus (EVM chains). Shows each flag it found, or says nothing was flagged, or says it cannot check. */
export function RiskPanel({ networkId, address }: { networkId: string; address: string }) {
  const [st, setSt] = useState<State>({ s: "loading" });
  useEffect(() => {
    let live = true;
    void fetch(`/api/security?network=${networkId}&address=${encodeURIComponent(address)}`)
      .then(async (r) => ({ ok: r.ok, j: (await r.json()) as { report: Report | null; covered?: boolean } }))
      .then(({ ok, j }) => live && setSt(!ok ? { s: "error" } : j.report ? { s: "ok", r: j.report } : { s: "none" }))
      .catch(() => live && setSt({ s: "error" }));
    return () => {
      live = false;
    };
  }, [networkId, address]);

  return (
    <section className="card p-4 md:p-5" aria-label="Security check">
      <h2 className="h3 mb-3 flex items-center gap-2"><NavIcon name="shield" size={20} /> Security check</h2>
      {st.s === "loading" && <div className="skeleton h-16" />}
      {st.s === "none" && <p className="text-sm text-soft">No security record is available for this token. That is not a sign it is safe. Checks cover EVM chains only.</p>}
      {st.s === "error" && <p className="text-sm text-soft" role="status">The security provider is not responding. Try again later.</p>}
      {st.s === "ok" && (
        <>
          {st.r.flags.length === 0 ? <p className="text-sm text-soft">None of the {st.r.checked} checks raised a flag. This is not a guarantee of safety.</p> : (
            <ul className="space-y-2">
              {st.r.flags.map((f) => <li key={f.label} className="flex items-start gap-2.5 text-sm"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE[f.level]}`} aria-hidden="true" /><span>{f.label}</span></li>)}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">{st.r.holders !== null ? `${st.r.holders.toLocaleString()} holders. ` : ""}Source GoPlus. Automated checks can miss risks.</p>
        </>
      )}
    </section>
  );
}
