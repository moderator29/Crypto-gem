import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { TOOLS, toolBySlug } from "@/lib/tools/registry";
import { ToolGlyph } from "./ToolGlyph";

/** Shared frame for every calculator page: header, the calculator, a fixed honest note, and links to the other tools. */
export function ToolPage({ slug, children }: { slug: string; children: ReactNode }) {
  const tool = toolBySlug(slug);
  if (!tool) return null;
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader eyebrow="Trader tools" title={tool.title} description={tool.blurb} crumbs={[{ label: "Tools", href: "/tools" }, { label: tool.title }]} />
      {children}
      <p className="mt-4 rounded-[var(--r-md)] border border-line bg-[var(--surface-2)] px-4 py-3 text-xs leading-relaxed text-muted">
        Educational use only, not financial advice. This calculator works only from the numbers you type. It does not use live prices and it cannot predict what a market will do.
      </p>
      <nav aria-label="Other tools" className="mt-8">
        <h2 className="eyebrow mb-3 !text-muted">More tools</h2>
        <ul className="stagger grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.filter((t) => t.slug !== slug).map((t) => (
            <li key={t.slug}>
              <Link href={`/tools/${t.slug}`} className="card-flat hover-lift flex min-h-12 items-center gap-3 px-3.5 py-2.5 text-sm font-semibold">
                <ToolGlyph icon={t.icon} size={18} />
                <span className="truncate">{t.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
