import { ArrowRight, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { slugify, type Block } from "@/lib/content/learnTypes";

/** Renders the typed article blocks with consistent spacing and anchors on headings. */
export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-soft md:text-base md:leading-8">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return <p key={i}>{b.text}</p>;
          case "h2":
            return <h2 key={i} id={slugify(b.text)} className="h2 scroll-mt-24 pt-4 text-text">{b.text}</h2>;
          case "ul":
            return <ul key={i} className="ml-5 list-disc space-y-2 marker:text-brand">{b.items.map((t) => <li key={t}>{t}</li>)}</ul>;
          case "ol":
            return <ol key={i} className="ml-5 list-decimal space-y-2 marker:font-semibold marker:text-brand">{b.items.map((t) => <li key={t}>{t}</li>)}</ol>;
          case "callout":
            return (
              <aside key={i} className={`flex gap-3 rounded-[var(--r-md)] border p-4 text-sm leading-relaxed ${b.tone === "warn" ? "border-[color-mix(in_srgb,var(--warm)_35%,transparent)] bg-[color-mix(in_srgb,var(--warm)_8%,transparent)]" : "border-[color-mix(in_srgb,var(--brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--brand)_7%,transparent)]"}`}>
                {b.tone === "warn" ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warm" aria-hidden="true" /> : <Info size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />}
                <div><p className="font-semibold text-text">{b.title}</p><p className="mt-1 text-soft">{b.text}</p></div>
              </aside>
            );
          case "cta":
            return <p key={i}><Link href={b.href} className="btn btn-primary btn-sm">{b.label} <ArrowRight size={14} aria-hidden="true" /></Link></p>;
        }
      })}
    </div>
  );
}
