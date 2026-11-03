import { Info } from "lucide-react";
import type { ReactNode } from "react";

/** Small contextual help. Keyboard focusable, works on touch through focus, no popover library needed. */
export function Tip({ children, label = "More information" }: { children: ReactNode; label?: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label={label} className="grid h-5 w-5 place-items-center rounded-full text-muted transition hover:text-text focus-visible:text-text">
        <Info size={14} aria-hidden="true" />
      </button>
      <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-56 -translate-x-1/2 rounded-xl border border-[var(--line-2)] bg-[var(--surface-3)] p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-soft opacity-0 shadow-[var(--shadow-lg)] transition duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
        {children}
      </span>
    </span>
  );
}
