import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Consistent empty, unavailable and error presentation. Says what happened and what to do next. */
export function EmptyState({ icon: Icon, title, description, action, tone = "neutral" }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; tone?: "neutral" | "error" }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center" role={tone === "error" ? "alert" : "status"}>
      {Icon && (
        <span className={`grid h-12 w-12 place-items-center rounded-lg ${tone === "error" ? "bg-[color-mix(in_srgb,var(--down)_14%,transparent)] text-down" : "icon-tile"}`}>
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <h3 className="h3">{title}</h3>
      {description && <p className="max-w-md text-sm text-soft">{description}</p>}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
