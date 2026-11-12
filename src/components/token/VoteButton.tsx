"use client";

import { ArrowUp } from "lucide-react";
import { playSound } from "@/components/fx/sound";
import { toggleStar, useStars } from "@/lib/local/stars";

/** "Starred by you" toggle for a listed project, saved on this device. No shared count is shown because none is kept. */
export function VoteButton({ submissionId }: { submissionId: string; initialVotes?: number }) {
  const key = `listing:${submissionId}`;
  const on = useStars().includes(key);
  return (
    <div className="space-y-1.5">
      <button type="button" className={`btn w-full ${on ? "btn-primary" : ""}`} aria-pressed={on} onClick={() => { if (toggleStar(key)) playSound("coin"); }}>
        <ArrowUp size={16} aria-hidden="true" /> {on ? "Starred by you" : "Star this project"}
      </button>
      <p className="text-[11px] text-muted">Saved on this device only. There is no public vote count.</p>
    </div>
  );
}
