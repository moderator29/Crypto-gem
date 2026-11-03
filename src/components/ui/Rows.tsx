import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavIcon, type NavIconName } from "./NavIcon";

/** A titled group of settings rows inside one rounded container, like a phone settings screen. */
export function RowGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="eyebrow px-1">{title}</h2>
      <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">{children}</ul>
    </section>
  );
}

const ROW = "nav-row flex min-h-14 w-full items-center gap-3.5 px-4 text-left transition-colors hover:bg-[var(--surface-2)]";

function Lead({ icon, label, hint }: { icon: NavIconName; label: string; hint?: string }) {
  return (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-3)] text-soft"><NavIcon name={icon} size={20} /></span>
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{label}</span>{hint && <span className="block truncate text-xs text-muted">{hint}</span>}</span>
    </>
  );
}

/** Row that navigates. The value on the right is optional context such as the current language. */
export function LinkRow({ href, icon, label, hint, value }: { href: string; icon: NavIconName; label: string; hint?: string; value?: string }) {
  return (
    <li>
      <Link href={href} className={ROW}>
        <Lead icon={icon} label={label} hint={hint} />
        {value && <span className="text-sm text-muted">{value}</span>}
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** Row that opens an action, such as a menu or a dialog. */
export function ActionRow({ onClick, icon, label, hint, value, danger }: { onClick: () => void; icon: NavIconName; label: string; hint?: string; value?: string; danger?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onClick} className={`${ROW} ${danger ? "text-down" : ""}`}>
        <Lead icon={icon} label={label} hint={hint} />
        {value && <span className="text-sm text-muted">{value}</span>}
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </button>
    </li>
  );
}

/** Row with an on/off switch. */
export function SwitchRow({ checked, onChange, icon, label, hint }: { checked: boolean; onChange: (v: boolean) => void; icon: NavIconName; label: string; hint?: string }) {
  return (
    <li>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={ROW}>
        <Lead icon={icon} label={label} hint={hint} />
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-[var(--brand)]" : "bg-[var(--surface-3)] shadow-[inset_0_0_0_1px_var(--line-2)]"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all duration-200 ${checked ? "left-[22px]" : "left-0.5"}`} />
        </span>
      </button>
    </li>
  );
}
