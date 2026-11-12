"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { playSound } from "@/components/fx/sound";
import { useToast } from "@/components/ui/Toast";
import { accessToken } from "@/lib/auth/client";

const counts = new Map<string, number>();
const pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

/** Batches count lookups from many rows into one request. */
function want(key: string) {
  if (counts.has(key) || pending.has(key)) return;
  pending.add(key);
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const keys = [...pending].slice(0, 100);
    keys.forEach((k) => pending.delete(k));
    try {
      const r = await fetch(`/api/votes?keys=${encodeURIComponent(keys.join(","))}`);
      const j = (await r.json()) as { counts?: Record<string, number> };
      for (const k of keys) counts.set(k, j.counts?.[k] ?? 0);
    } catch {
      for (const k of keys) counts.set(k, 0);
    }
    listeners.forEach((f) => f());
  }, 60);
}

/** Upvote box: the count beside an up arrow, like the lists people already know. One vote per token per day. */
export function TokenVote({ network, address, className = "" }: { network: string; address: string; className?: string }) {
  const { authenticated, login } = useAuth();
  const toast = useToast();
  const key = `${network}:${address}`;
  const [, bump] = useState(0);
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    const f = () => bump((n) => n + 1);
    listeners.add(f);
    want(key);
    return () => void listeners.delete(f);
  }, [key]);

  async function vote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!authenticated) return login();
    setBusy(true);
    try {
      const jwt = await accessToken();
      const r = await fetch("/api/votes", { method: "POST", headers: { "content-type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) }, body: JSON.stringify({ network, address }) });
      const j = (await r.json().catch(() => ({}))) as { votes?: number; error?: string };
      if (r.ok) {
        counts.set(key, j.votes ?? (counts.get(key) ?? 0) + 1);
        setVoted(true);
        playSound("coin");
        listeners.forEach((f) => f());
      } else {
        if (r.status === 409) setVoted(true);
        toast.error(j.error ?? "Could not vote");
      }
    } catch {
      toast.error("Could not vote. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const n = counts.get(key);
  return (
    <span className={`relative z-10 inline-flex overflow-hidden rounded-md border border-[var(--line-2)] text-sm font-bold ${className}`}>
      <span className="num grid min-w-9 place-items-center bg-[var(--surface-2)] px-2 text-xs" aria-label={`${n ?? 0} votes`}>{n === undefined ? "–" : n.toLocaleString("en-US")}</span>
      <button type="button" onClick={(e) => void vote(e)} disabled={busy} aria-pressed={voted} aria-label="Upvote this token" className={`grid h-8 w-9 place-items-center transition ${voted ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-3)] hover:bg-[var(--brand)] hover:text-white"}`}>
        <ArrowUp size={16} />
      </button>
    </span>
  );
}
