import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

/** Standard top of every page: trail, eyebrow, title, one-line purpose, and page-level actions. */
export function PageHeader({ title, description, eyebrow, crumbs, actions }: { title: string; description?: ReactNode; eyebrow?: string; crumbs?: Crumb[]; actions?: ReactNode }) {
  return (
    <header className="mb-6 md:mb-8">
      {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
          <h1 className="h1">{title}</h1>
          {description && <p className="mt-2 text-[15px] text-soft md:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
