"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { playSound } from "@/components/fx/sound";

/**
 * Accessible modal. Focus moves in, Tab stays inside, Escape and the backdrop close it, focus returns to the opener.
 * `variant="sheet"` slides up from the bottom on phones and sits centred on larger screens.
 */
export function Dialog({ open, onClose, title, description, children, variant = "dialog", footer }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; variant?: "dialog" | "sheet"; footer?: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    playSound("whoosh");
    const focusables = () => [...(panel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])];
    (focusables()[0] ?? panel.current)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return e.preventDefault();
      const first = f[0] as HTMLElement;
      const last = f[f.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`fixed inset-0 z-[110] flex ${variant === "sheet" ? "items-end sm:items-center" : "items-center"} justify-center p-0 sm:p-4`}>
      <div className="fx-fade absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1} className={`${variant === "sheet" ? "fx-sheet rounded-b-none sm:rounded-b-2xl" : "fx-pop"} glass-float relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden !rounded-2xl !bg-[var(--surface-1)] outline-none`}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {variant === "sheet" && <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-[var(--line-2)] sm:hidden" aria-hidden="true" />}
            <h2 id={titleId} className="h3">{title}</h2>
            {description && <p id={descId} className="mt-1 text-sm text-soft">{description}</p>}
          </div>
          <button type="button" className="btn btn-icon btn-sm shrink-0" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
