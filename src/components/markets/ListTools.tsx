"use client";

import { Link2, Rows3, Rows4, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { setDisplayPrefs, useDisplayPrefs } from "@/lib/displayPrefs";
import { setListQuery, useListQuery } from "./listFilter";

/** Comfortable or compact rows, using the same preference the settings page and home board read. */
export function DensityToggle() {
  const { compact } = useDisplayPrefs();
  return (
    <div role="radiogroup" aria-label="Row density" className="mk-seg">
      <button type="button" role="radio" aria-checked={!compact} aria-label="Comfortable rows" title="Comfortable rows" className="mk-seg-btn !px-2.5" onClick={() => setDisplayPrefs({ compact: false })}><Rows3 size={15} aria-hidden="true" /></button>
      <button type="button" role="radio" aria-checked={compact} aria-label="Compact rows" title="Compact rows" className="mk-seg-btn !px-2.5" onClick={() => setDisplayPrefs({ compact: true })}><Rows4 size={15} aria-hidden="true" /></button>
    </div>
  );
}

/** Filters the rows already on the page by name, symbol or address. Press / anywhere to jump here. */
export function FindBox() {
  const q = useListQuery();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", on);
    return () => {
      window.removeEventListener("keydown", on);
      setListQuery("");
    };
  }, []);
  return (
    <div className="relative min-w-0 flex-1 basis-40 sm:max-w-[260px]">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        className="input !h-9 !pl-9 !pr-8 !text-[13px]"
        placeholder="Find in this list"
        aria-label="Find in this list"
        aria-keyshortcuts="/"
        value={q}
        onChange={(e) => setListQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { setListQuery(""); e.currentTarget.blur(); } }}
      />
      {q ? (
        <button type="button" aria-label="Clear find" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text" onClick={() => { setListQuery(""); ref.current?.focus(); }}><X size={14} aria-hidden="true" /></button>
      ) : (
        <kbd className="mk-kbd pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 md:grid" aria-hidden="true">/</kbd>
      )}
    </div>
  );
}

/** Copies the address of the page, which already carries the chain, sort and page. */
export function CopyViewLink() {
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-sm btn-icon"
      aria-label="Copy link to this view"
      title="Copy link to this view"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Link to this view copied");
        } catch {
          toast.error("Could not copy", "Copy the address from the browser bar instead.");
        }
      }}
    >
      <Link2 size={15} aria-hidden="true" />
    </button>
  );
}
