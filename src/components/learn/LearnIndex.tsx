"use client";

import { ArrowRight, Clock, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Spotlight } from "@/components/fx/Spotlight";
import { EmptyState } from "@/components/ui/EmptyState";
import { CATEGORIES, type LearnCategory } from "@/lib/content/learnTypes";

export interface ArticleCard { slug: string; title: string; summary: string; category: LearnCategory; minutes: number; text: string }

/** Category chips and a live search over the article list. */
export function LearnIndex({ articles }: { articles: ArticleCard[] }) {
  const [cat, setCat] = useState<LearnCategory | "All">("All");
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return articles.filter((a) => (cat === "All" || a.category === cat) && (needle === "" || a.text.includes(needle)));
  }, [articles, cat, q]);
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Search articles</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input className="input" style={{ paddingLeft: 38 }} type="search" placeholder="Search articles" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="scroll-x" role="group" aria-label="Category">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button key={c} type="button" className="chip shrink-0" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted" aria-live="polite">{shown.length} {shown.length === 1 ? "article" : "articles"}</p>
      {shown.length === 0 ? (
        <EmptyState icon={SearchX} title="No articles match" description="Try a different word or clear the category filter." action={<button type="button" className="btn btn-sm" onClick={() => { setQ(""); setCat("All"); }}>Clear filters</button>} />
      ) : (
        <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((a) => (
            <li key={a.slug}>
              <Spotlight className="card hover-lift h-full">
                <Link href={`/learn/${a.slug}`} className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge badge-brand">{a.category}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted"><Clock size={12} aria-hidden="true" /> {a.minutes} min</span>
                  </div>
                  <h2 className="h3">{a.title}</h2>
                  <p className="flex-1 text-sm text-soft">{a.summary}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">Read <ArrowRight size={15} aria-hidden="true" /></span>
                </Link>
              </Spotlight>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
