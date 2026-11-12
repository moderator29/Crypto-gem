"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { playSound } from "@/components/fx/sound";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { addLocalAlert, useAlertChecker } from "@/lib/local/alerts";
import { priceUsd } from "@/lib/utils/format";
import { NotifyPermission } from "./AlertsView";

/** Bell button that opens a small dialog to set a price alert for one token, saved on this device. */
export function QuickAlert({ network, address, symbol, name, price, logo = null, compact = false }: { network: string; address: string; symbol: string; name: string; price: number | null; logo?: string | null; compact?: boolean }) {
  useAlertChecker();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("");

  function launch(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setTarget(price ? String(Number((price * 1.1).toPrecision(4))) : "");
    setDir("above");
    setOpen(true);
  }

  function save() {
    const n = Number(target);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter a price above zero.");
    addLocalAlert({ network, address, symbol, name, logo, direction: dir, price: n });
    playSound("success");
    toast.success(`Alert set for ${symbol}`, `Saved on this device. Fires when it goes ${dir} ${priceUsd(n)} while the site is open.`);
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={launch} aria-label={`Set a price alert for ${symbol}`} className={`relative z-10 grid place-items-center rounded-lg text-muted transition hover:bg-[var(--surface-3)] hover:text-text ${compact ? "h-9 w-9" : "h-10 w-10"}`}>
        <Bell size={compact ? 16 : 17} />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} variant="sheet" title={`Price alert for ${symbol}`} description={price ? `Now ${priceUsd(price)}` : "Live price unavailable"} footer={<><button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={save}>Create alert</button></>}>
        <div className="space-y-4">
          <div className="flex gap-2" role="group" aria-label="Direction">
            {(["above", "below"] as const).map((d) => <button key={d} type="button" className="chip flex-1 justify-center" aria-pressed={dir === d} onClick={() => setDir(d)}>Goes {d}</button>)}
          </div>
          <label className="block space-y-2 text-sm font-semibold">Target price (USD)
            <input className="input num" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") save(); }} autoFocus />
          </label>
          {price && (
            <div className="flex flex-wrap gap-1.5">
              {[-20, -10, 10, 25, 50].map((p) => <button key={p} type="button" className="chip !min-h-8 !px-3" onClick={() => { setTarget(String(Number((price * (1 + p / 100)).toPrecision(4)))); setDir(p > 0 ? "above" : "below"); }}>{p > 0 ? "+" : ""}{p}%</button>)}
            </div>
          )}
          <NotifyPermission />
          <p className="text-xs text-muted">Saved on this device and checked every minute while the site is open in a tab. Uses DEX pool prices.</p>
        </div>
      </Dialog>
    </>
  );
}
