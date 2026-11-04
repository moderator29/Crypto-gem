import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

/** Standard top of every page: trail, eyebrow, title, one-line purpose, and page-level actions. A soft glow sits behind the title. */
export function PageHeader({ title, description, eyebrow, crumbs, actions }: { title: string; description?: ReactNode; eyebrow?: string; crumbs?: Crumb[]; actions?: ReactNode }) {
  return (
    <header className="relative isolate mb-6 md:mb-8">
      <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-16 -z-10 h-56 w-[min(520px,90%)] rounded-full bg-[radial-gradient(closest-side,var(--aurora-a),transparent)] opacity-70 blur-2xl" />
      {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <p className="eyebrow mb-2.5 inline-flex items-center gap-2"><span className="h-px w-6 bg-[var(--brand)]" aria-hidden="true" />{eyebrow}</p>}
          <h1 className="h1">{title}</h1>
          {description && <p className="mt-2 text-[15px] text-soft md:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="fx-divider mt-5" aria-hidden="true" />
    </header>
  );
}
