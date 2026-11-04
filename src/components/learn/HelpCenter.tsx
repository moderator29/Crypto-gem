"use client";

import { ChevronDown, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { HELP_GROUPS, type Faq, type HelpGroup } from "@/lib/content/help";

/** Searchable FAQ grouped by topic. Answers open with an animated height and only one is read aloud at a time. */
export function HelpCenter({ faqs }: { faqs: Faq[] }) {
  const [group, setGroup] = useState<HelpGroup | "All">("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return faqs.filter((f) => (group === "All" || f.group === group) && (needle === "" || `${f.q} ${f.a}`.toLowerCase().includes(needle)));
  }, [faqs, group, q]);
  const groups = group === "All" ? HELP_GROUPS.filter((g) => shown.some((f) => f.group === g)) : [group];
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Search help</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="input" style={{ paddingLeft: 38 }} type="search" placeholder="Search questions" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="scroll-x" role="group" aria-label="Topic">
          {(["All", ...HELP_GROUPS] as const).map((g) => (
            <button key={g} type="button" className="chip shrink-0" aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No answers found" description="Try fewer words, or contact us and we will help directly." action={<Link className="btn btn-primary btn-sm" href="/contact">Contact us</Link>} />
      ) : (
        groups.map((g) => (
          <section key={g} aria-labelledby={`help-${g}`} className="space-y-2">
            <h2 id={`help-${g}`} className="eyebrow !text-muted">{g}</h2>
            <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
              {shown.filter((f) => f.group === g).map((f) => {
                const isOpen = open === f.id;
                return (
                  <li key={f.id}>
                    <h3>
                      <button type="button" aria-expanded={isOpen} aria-controls={`ans-${f.id}`} onClick={() => setOpen(isOpen ? null : f.id)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-[15px] font-semibold transition-colors hover:bg-[var(--surface-2)]">
                        <span>{f.q}</span>
                        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-muted transition-transform duration-300 ${isOpen ? "rotate-180 text-brand" : ""}`} />
                      </button>
                    </h3>
                    <div id={`ans-${f.id}`} role="region" aria-label={f.q} inert={!isOpen} className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-soft">
                          <p>{f.a}</p>
                          {f.link && <Link href={f.link.href} className="inline-block font-semibold text-brand">{f.link.label}</Link>}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
