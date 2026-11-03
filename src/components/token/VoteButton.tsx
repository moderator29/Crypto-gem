"use client";

import { Rocket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { accessToken } from "@/lib/auth/client";

/** Community vote for a listed project. The 30 minute rule is stated up front, not only after a failure. */
export function VoteButton({ submissionId, initialVotes }: { submissionId: string; initialVotes: number }) {
  const { configured, authenticated, login } = useAuth();
  const [votes, setVotes] = useState(initialVotes);
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function vote() {
    if (!authenticated) return login();
    setState("busy");
    setMsg(null);
    const jwt = await accessToken();
    const res = await fetch("/api/vote", { method: "POST", headers: { "content-type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) }, body: JSON.stringify({ submissionId }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setVotes(j.votes ?? votes + 1);
      setState("ok");
      setMsg("Vote counted");
    } else {
      setState("error");
      setMsg(j.error ?? "Could not vote");
    }
  }

  return (
    <div className="space-y-1.5">
      <button type="button" className="btn btn-primary w-full" disabled={state === "busy"} onClick={vote} aria-describedby="vote-rule">
        <Rocket size={16} /> <span className="num">{votes.toLocaleString("en-US")}</span> Vote
      </button>
      <p id="vote-rule" className="text-[11px] text-muted">One vote per project per day, and 30 minutes between votes. {!configured && "Sign-in is not configured here, so voting is read only."}</p>
      {msg && <p className={`text-xs ${state === "ok" ? "text-up" : "text-down"}`} role="status">{msg}{state === "error" && !authenticated && <> <Link href="/login" className="font-semibold text-brand">Sign in</Link></>}</p>}
    </div>
  );
}
