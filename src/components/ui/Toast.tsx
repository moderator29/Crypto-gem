"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";
interface Item {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
}
interface Api {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const Ctx = createContext<Api | null>(null);
const ICON = { success: CheckCircle2, error: AlertCircle, info: Info } as const;
const COLOR = { success: "text-up", error: "text-down", info: "text-brand" } as const;

/** Non-blocking confirmation for quick actions. Used for results, never for navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone: Tone, title: string, description?: string) => {
      const id = ++seq.current;
      setItems((l) => [...l.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );
  const api = useMemo<Api>(() => ({ success: (t, d) => push("success", t, d), error: (t, d) => push("error", t, d), info: (t, d) => push("info", t, d) }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+16px)] z-[100] flex flex-col items-center gap-2 px-4 xl:bottom-6 xl:items-end xl:pr-6" aria-live="polite" aria-atomic="false">
        {items.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="glass-float pop-in pointer-events-auto flex w-full max-w-sm items-start gap-3 !rounded-2xl p-3.5">
              <Icon size={18} className={`mt-0.5 shrink-0 ${COLOR[t.tone]}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-soft">{t.description}</p>}
              </div>
              <button type="button" className="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:text-text" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): Api {
  const c = useContext(Ctx);
  // Outside the provider (tests, isolated renders) calls become no-ops instead of crashing.
  return c ?? { success: () => undefined, error: () => undefined, info: () => undefined };
}
