"use client";

import { History, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "cg-recent-searches";
const MAX = 8;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}
function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage unavailable: recent searches simply are not kept */
  }
}

/** Records a query the user actually searched for. Renders nothing. */
export function RememberSearch({ q }: { q: string }) {
  useEffect(() => {
    write([q, ...read().filter((x) => x.toLowerCase() !== q.toLowerCase())]);
  }, [q]);
  return null;
}

/** The user's last searches with one-tap repeat and clear. Browser-local, never sent anywhere. */
export function RecentSearches() {
  const [items, setItems] = useState<string[] | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setItems(read()), 0);
    return () => clearTimeout(id);
  }, []);
  if (!items || items.length === 0) return null;
  return (
    <section aria-label="Recent searches" className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="h3 flex items-center gap-2"><History size={16} aria-hidden="true" /> Recent</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { write([]); setItems([]); }}><X size={14} /> Clear</button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((q) => (
          <li key={q}><Link href={`/search?q=${encodeURIComponent(q)}`} className="chip max-w-[260px] truncate">{q}</Link></li>
        ))}
      </ul>
    </section>
  );
}
