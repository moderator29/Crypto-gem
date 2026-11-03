import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Header for a section inside a page. Optional link goes to the dedicated page for that section. */
export function SectionHeader({ title, description, href, linkLabel = "View all", icon, children }: { title: string; description?: string; href?: string; linkLabel?: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="panel-title !text-[15px]">{icon}{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {href && (
          <Link href={href} className="group inline-flex items-center gap-1 text-sm font-semibold text-brand transition hover:text-text">
            {linkLabel} <ArrowRight size={15} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
