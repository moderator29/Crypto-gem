"use client";

import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { browserSupabase } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error" | "unconfigured">("idle");
  const [msg, setMsg] = useState("");
  const sb = browserSupabase();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return setState("unconfigured");
    setState("busy");
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}${next}` } });
    if (error) {
      setMsg(error.message);
      setState("error");
    } else setState("sent");
  }

  return (
    <form onSubmit={send} className="glass space-y-4 p-6">
      <h1 className="font-display text-2xl font-bold">Sign in</h1>
      <p className="text-sm text-soft">We email you a one-time link. No password.</p>
      {state === "unconfigured" || !sb ? (
        <p className="glass-flat p-3 text-sm text-warm" role="status">Accounts are not connected in this environment yet (Supabase keys missing).</p>
      ) : state === "sent" ? (
        <p className="glass-flat p-3 text-sm" role="status">Check your inbox for the sign-in link.</p>
      ) : (
        <>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email" />
          <button className="btn btn-primary w-full" disabled={state === "busy"}>
            {state === "busy" ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Email me a link
          </button>
          {state === "error" && <p className="text-sm text-down" role="alert">{msg}</p>}
        </>
      )}
    </form>
  );
}
