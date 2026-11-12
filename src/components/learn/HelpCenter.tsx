"use client";

import { ChevronDown, Search, SearchX, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Highlight } from "@/components/engage/Highlight";
import { EmptyState } from "@/components/ui/EmptyState";
import { HELP_GROUPS, type Faq, type HelpGroup } from "@/lib/content/help";
import { matchesAll } from "@/lib/engage/highlight";
import { setVote, type Vote } from "@/lib/engage/progress";
import { useHelpVotes } from "@/lib/engage/useProgress";

/** Thumbs for one answer. The choice is stored in this browser and nothing is sent to us. */
function Helpful({ id, vote }: { id: string; vote: Vote | undefined }) {
  const pick = (v: Vote) => setVote(id, vote === v ? null : v);
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <span className="text-xs font-semibold text-soft">Was this helpful?</span>
      <button type="button" className="btn btn-icon btn-sm" aria-pressed={vote === "up"} aria-label="Yes, this helped" onClick={() => pick("up")}><ThumbsUp size={14} aria-hidden="true" /></button>
      <button type="button" className="btn btn-icon btn-sm" aria-pressed={vote === "down"} aria-label="No, this did not help" onClick={() => pick("down")}><ThumbsDown size={14} aria-hidden="true" /></button>
      <span className="text-xs text-muted" aria-live="polite">
        {vote === "down" ? <>Sorry about that. <Link href="/contact" className="font-semibold text-brand">Contact us</Link> and we will help. </> : vote === "up" ? "Glad it helped. " : ""}
        Your answer is saved on this device only. We do not receive it.
      </span>
    </div>
  );
}

/** Searchable FAQ grouped by topic. Matches are highlighted, arrow keys move between questions, and answers open with an animated height. */
export function HelpCenter({ faqs }: { faqs: Faq[] }) {
  const [group, setGroup] = useState<HelpGroup | "All">("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const votes = useHelpVotes();
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => faqs.filter((f) => (group === "All" || f.group === group) && matchesAll(`${f.q} ${f.a}`, q)), [faqs, group, q]);
  const groups = group === "All" ? HELP_GROUPS.filter((g) => shown.some((f) => f.group === g)) : [group];

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>("[data-faq-btn]") ?? [])];
    const at = buttons.indexOf(e.target as HTMLButtonElement);
    if (e.target === search.current) {
      if (e.key === "ArrowDown" && buttons[0]) {
        e.preventDefault();
        buttons[0].focus();
      } else if (e.key === "Escape" && q !== "") {
        setQ("");
      }
      return;
    }
    if (at < 0) return;
    const go = (b: HTMLElement | undefined) => {
      e.preventDefault();
      b?.focus();
    };
    if (e.key === "ArrowDown") go(buttons[Math.min(at + 1, buttons.length - 1)]);
    else if (e.key === "ArrowUp") go(at === 0 ? search.current ?? undefined : buttons[at - 1]);
    else if (e.key === "Home") go(buttons[0]);
    else if (e.key === "End") go(buttons[buttons.length - 1]);
    else if (e.key === "Escape" && open !== null) setOpen(null);
  };

  return (
    <div ref={root} className="space-y-5" onKeyDown={move}>
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Search help</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input ref={search} className="input" style={{ paddingLeft: 38 }} type="search" placeholder="Search questions" value={q} onChange={(e) => setQ(e.target.value)} aria-describedby="help-hint" />
        </label>
        <div className="scroll-x" role="group" aria-label="Topic">
          {(["All", ...HELP_GROUPS] as const).map((g) => (
            <button key={g} type="button" className="chip shrink-0" aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
        <p id="help-hint" className="text-xs text-muted" aria-live="polite">{shown.length} {shown.length === 1 ? "answer" : "answers"}. Use the arrow keys to move between questions and Enter to open one.</p>
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No answers found" description="Try fewer words, or browse the glossary and guides. You can also contact us and we will help directly." action={<div className="flex flex-wrap justify-center gap-2"><Link className="btn btn-primary btn-sm" href="/contact">Contact us</Link><Link className="btn btn-sm" href="/glossary">Open the glossary</Link></div>} />
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
                      <button type="button" data-faq-btn aria-expanded={isOpen} aria-controls={`ans-${f.id}`} onClick={() => setOpen(isOpen ? null : f.id)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-[15px] font-semibold transition-colors hover:bg-[var(--surface-2)]">
                        <span><Highlight text={f.q} query={q} /></span>
                        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-muted transition-transform duration-300 ${isOpen ? "rotate-180 text-brand" : ""}`} />
                      </button>
                    </h3>
                    <div id={`ans-${f.id}`} role="region" aria-label={f.q} inert={!isOpen} className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-soft">
                          <p><Highlight text={f.a} query={q} /></p>
                          {f.link && <Link href={f.link.href} className="inline-block font-semibold text-brand">{f.link.label}</Link>}
                          <Helpful id={f.id} vote={votes[f.id]} />
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
