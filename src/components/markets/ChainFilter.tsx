"use client";

import { Check, ChevronDown, Layers } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChainBadge } from "@/components/ui/ChainBadge";

export interface ChainOption {
  id: string | null;
  label: string;
  count?: number;
  href?: string;
}

/** One button that opens an inline vertical list of chains. Choosing a chain applies it and closes the list. */
export function ChainFilter({ options, value, onChange }: { options: ChainOption[]; value: string | null; onChange?: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.id === value) ?? options[0];
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const row = "flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold transition hover:bg-[var(--surface-3)]";
  return (
    <div ref={root} className="relative">
      <button type="button" className="btn" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}>
        {current?.id ? <ChainBadge networkId={current.id} size={18} /> : <Layers size={16} aria-hidden="true" />}
        <span>{current?.label ?? "All chains"}</span>
        <ChevronDown size={15} aria-hidden="true" className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul id={listId} className="glass-float absolute left-0 top-[calc(100%+8px)] z-30 !bg-[var(--surface-2)] max-h-[60vh] w-64 max-w-[calc(100vw-32px)] overflow-y-auto !rounded-2xl py-1">
          {options.map((o) => {
            const inner = (
              <>
                {o.id ? <ChainBadge networkId={o.id} size={22} /> : <Layers size={20} className="text-muted" aria-hidden="true" />}
                <span className="flex-1 truncate">{o.label}</span>
                {o.count !== undefined && <span className="num text-xs text-muted">{o.count}</span>}
                {o.id === (current?.id ?? null) && <Check size={16} className="text-brand" aria-hidden="true" />}
              </>
            );
            return (
              <li key={o.id ?? "all"}>
                {o.href ? (
                  <Link href={o.href} className={row} onClick={() => setOpen(false)} aria-current={o.id === (current?.id ?? null) ? "true" : undefined}>{inner}</Link>
                ) : (
                  <button type="button" className={row} onClick={() => { onChange?.(o.id); setOpen(false); }} aria-pressed={o.id === (current?.id ?? null)}>{inner}</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
