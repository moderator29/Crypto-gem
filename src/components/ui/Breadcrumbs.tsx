import { ChevronRight } from "lucide-react";
import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/** Location trail. The last item is the current page and is not a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="transition hover:text-text">{c.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-soft" : ""}>{c.label}</span>
              )}
              {!last && <ChevronRight size={13} aria-hidden="true" className="opacity-60" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
