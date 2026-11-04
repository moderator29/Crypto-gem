import { Check, Circle } from "lucide-react";
import { TokenLogo } from "@/components/ui/TokenLogo";

export interface SummaryField { label: string; value: string | null }

/** Live summary beside the add-coin form. Each field gets an animated check as soon as it has a real value. */
export function SummaryPanel({ logo, symbol, name, fields }: { logo: string | null; symbol: string; name: string; fields: SummaryField[] }) {
  const filled = fields.filter((f) => f.value).length;
  return (
    <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start" aria-label="Listing summary">
      <div className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <TokenLogo src={logo} symbol={symbol || "?"} size={48} />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold">{name || "Your project"}</p>
            <p className="num text-xs text-muted">{filled} of {fields.length} filled</p>
          </div>
        </div>
        <ul className="space-y-2.5">
          {fields.map((f) => (
            <li key={f.label} className="flex items-start gap-2.5 text-sm">
              {f.value ? (
                <span key="on" className="fx-pop mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--up)] text-black"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
              ) : (
                <Circle size={20} className="mt-0.5 shrink-0 text-[var(--line-2)]" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className="block text-xs text-muted">{f.label}</span>
                <span className={`block truncate ${f.value ? "font-semibold" : "text-muted"}`}>{f.value ?? "Not yet"}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
