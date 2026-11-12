"use client";

import { ChevronDown, Link as LinkIcon, Search, SearchX } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { letterOf, type GlossaryTerm } from "@/lib/content/glossary";
import { matchesAll } from "@/lib/engage/highlight";
import { Highlight } from "./Highlight";

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const readHash = () => window.location.hash;

/** Searchable A to Z glossary. Terms expand in place, deep links such as #slippage open and scroll to the term. */
export function GlossaryView({ terms }: { terms: GlossaryTerm[] }) {
  const toast = useToast();
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const [q, setQ] = useState("");
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState("A");
  const names = useMemo(() => new Map(terms.map((t) => [t.slug, t.term])), [terms]);
  const shown = useMemo(() => terms.filter((t) => matchesAll(`${t.term} ${t.definition}`, q)), [terms, q]);
  const letters = useMemo(() => [...new Set(terms.map((t) => letterOf(t.term)))], [terms]);
  const live = useMemo(() => new Set(shown.map((t) => letterOf(t.term))), [shown]);
  const isOpen = (slug: string) => toggled[slug] ?? hash === `#${slug}`;

  useEffect(() => {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }), 60);
    return () => clearTimeout(t);
  }, [hash]);

  useEffect(() => {
    const els = letters.map((l) => document.getElementById(`letter-${l}`)).filter((e): e is HTMLElement => e !== null);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id.replace("letter-", ""));
      },
      { rootMargin: "-130px 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [letters, shown]);

  const toggle = (slug: string) => {
    const next = !isOpen(slug);
    setToggled((p) => ({ ...p, [slug]: next }));
    if (next) window.history.replaceState(null, "", `#${slug}`);
  };
  const setAll = (open: boolean) => setToggled(Object.fromEntries(shown.map((t) => [t.slug, open])));
  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${slug}`);
      toast.success("Link copied", "It opens straight to this term.");
    } catch {
      toast.error("Could not copy the link");
    }
  };
  const allOpen = shown.length > 0 && shown.every((t) => isOpen(t.slug));

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Search the glossary</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="input" style={{ paddingLeft: 38 }} type="search" placeholder="Search terms and definitions" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted" aria-live="polite">{shown.length} of {terms.length} terms</p>
          {shown.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll(!allOpen)}>{allOpen ? "Collapse all" : "Expand all"}</button>}
        </div>
      </div>
      <nav aria-label="Jump to letter" className="gloss-rail glass-float">
        <ul className="scroll-x flex gap-1">
          {letters.map((l) => (
            <li key={l}>
              {live.has(l) ? (
                <a href={`#letter-${l}`} className="gloss-letter" aria-current={active === l ? "true" : undefined}>{l}</a>
              ) : (
                <span className="gloss-letter" aria-disabled="true">{l}</span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No terms match" description="Try a shorter word, or clear the search." action={<button type="button" className="btn btn-sm" onClick={() => setQ("")}>Clear search</button>} />
      ) : (
        letters.filter((l) => live.has(l)).map((l) => (
          <section key={l} className="space-y-2">
            <h2 id={`letter-${l}`} className="gloss-head h2">{l}</h2>
            <ul className="card divide-y divide-[var(--line-1)] overflow-hidden">
              {shown.filter((t) => letterOf(t.term) === l).map((t) => {
                const open = isOpen(t.slug);
                return (
                  <li key={t.slug} id={t.slug} className="scroll-mt-36">
                    <h3>
                      <button type="button" aria-expanded={open} aria-controls={`def-${t.slug}`} onClick={() => toggle(t.slug)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-[15px] font-semibold transition-colors hover:bg-[var(--surface-2)]">
                        <span><Highlight text={t.term} query={q} /></span>
                        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180 text-brand" : ""}`} />
                      </button>
                    </h3>
                    <div id={`def-${t.slug}`} role="region" aria-label={t.term} inert={!open} className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-soft">
                          <p><Highlight text={t.definition} query={q} /></p>
                          <div className="flex flex-wrap items-center gap-2">
                            {t.related.length > 0 && <span className="text-xs text-muted">Related:</span>}
                            {t.related.map((r) => (
                              <a key={r} href={`#${r}`} className="chip" onClick={() => setQ("")}>{names.get(r) ?? r}</a>
                            ))}
                            <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => copyLink(t.slug)}><LinkIcon size={13} aria-hidden="true" /> Copy link</button>
                          </div>
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
