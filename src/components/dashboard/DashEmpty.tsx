import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Empty state with a slow orbiting ring and a floating icon, so a blank page still feels alive. */
export function DashEmpty({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="card fx-pop flex flex-col items-center gap-3 px-6 py-10 text-center" role="status">
      <div className="relative h-[120px] w-[120px]">
        <svg viewBox="0 0 120 120" width="120" height="120" fill="none" aria-hidden="true" className="absolute inset-0">
          <circle className="art-orbit" cx="60" cy="60" r="54" stroke="var(--line-2)" strokeWidth="1.5" strokeDasharray="3 9" strokeLinecap="round" />
          <g className="art-orbit-rev"><circle cx="60" cy="60" r="40" stroke="color-mix(in srgb, var(--brand) 40%, transparent)" strokeWidth="1.5" strokeDasharray="40 211" strokeLinecap="round" /></g>
          <circle className="art-twinkle" cx="16" cy="34" r="3" fill="var(--brand)" />
          <circle className="art-twinkle" cx="104" cy="82" r="2.5" fill="var(--brand-2)" />
          <circle className="art-twinkle" cx="92" cy="20" r="2" fill="var(--warm)" />
        </svg>
        <span className="fx-float icon-tile absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl"><Icon size={26} aria-hidden="true" /></span>
      </div>
      <h3 className="h3">{title}</h3>
      <p className="max-w-md text-sm text-soft">{description}</p>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
