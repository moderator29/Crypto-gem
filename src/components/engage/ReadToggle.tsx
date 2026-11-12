"use client";

import { Check, CheckCheck } from "lucide-react";
import { playSound } from "@/components/fx/sound";
import { setRead } from "@/lib/engage/progress";
import { useReadSlugs } from "@/lib/engage/useProgress";

/** Small "Read" badge for an article header or card. Renders nothing until the article is marked read. */
export function ReadBadge({ slug }: { slug: string }) {
  const read = useReadSlugs();
  if (!read.includes(slug)) return null;
  return <span className="badge badge-up fx-pop"><Check size={11} aria-hidden="true" /> Read</span>;
}

/** End-of-article button that marks the guide read. The state is kept in this browser only. */
export function ReadToggle({ slug }: { slug: string }) {
  const read = useReadSlugs();
  const done = read.includes(slug);
  return (
    <div className="card-flat flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{done ? "Marked as read" : "Finished this guide?"}</p>
        <p className="text-xs text-muted">Your reading progress is saved on this device only.</p>
      </div>
      <button
        type="button"
        className={`btn btn-sm ${done ? "" : "btn-primary"}`}
        aria-pressed={done}
        onClick={() => {
          setRead(slug, !done);
          if (!done) playSound("tap");
        }}
      >
        {done ? <CheckCheck size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} {done ? "Read. Undo" : "Mark as read"}
      </button>
    </div>
  );
}
