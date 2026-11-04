import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { CreativeReport } from "@/lib/export/creativeCheck";

const ICON = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle } as const;

/** Green, amber or red result for each creative check, with a plain note. */
export function CreativeChecklist({ report, name }: { report: CreativeReport; name: string }) {
  const worst = report.items.some((i) => i.level === "fail") ? "fail" : report.items.some((i) => i.level === "warn") ? "warn" : "pass";
  return (
    <div className="card-flat space-y-2 p-3" role={worst === "fail" ? "alert" : "status"} aria-label={`Checks for ${name}`}>
      <p className="truncate text-xs font-semibold text-soft">{name}</p>
      <ul className="space-y-1.5">
        {report.items.map((c, i) => {
          const Icon = ICON[c.level];
          return (
            <li key={c.id} className="check-row" data-level={c.level} style={{ ["--i" as string]: i }}>
              <Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0"><b>{c.label}</b><span className="text-soft">{c.note}</span><span className="sr-only"> ({c.level === "pass" ? "passed" : c.level === "warn" ? "warning" : "failed"})</span></span>
            </li>
          );
        })}
      </ul>
      {worst === "fail" && <p className="text-xs text-down">This image was not added. Fix the red items and upload it again.</p>}
    </div>
  );
}
