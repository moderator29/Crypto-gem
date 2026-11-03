import Link from "next/link";
import type { ReactNode } from "react";

/** Sectioned container: uppercase title bar, optional link, divided rows below. */
export function Panel({ title, icon, href, linkLabel = "View all", note, children }: { title: string; icon?: ReactNode; href?: string; linkLabel?: string; note?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="panel">
      <div className="panel-head">
        <h2 className="panel-title">{icon}{title}</h2>
        {note && <span className="hidden text-xs text-muted sm:block">{note}</span>}
        {href && <Link href={href} className="panel-link">{linkLabel}</Link>}
      </div>
      {children}
    </section>
  );
}
