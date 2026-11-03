"use client";

import { LogIn, Mail, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

export function LoginPanel({ next }: { next: string }) {
  const { configured, ready, authenticated, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authenticated) router.replace(next);
  }, [authenticated, next, router]);

  return (
    <section className="card space-y-4 p-6" aria-label="Sign in">
      <h1 className="font-display text-2xl font-bold">Sign in</h1>
      <p className="text-sm text-soft">Use an email code, your wallet, or Google. No password and no wallet is created for you.</p>
      {!configured ? (
        <p className="card-flat p-3 text-sm text-warm" role="status">Sign-in is not configured in this environment yet (Privy app id missing).</p>
      ) : !ready || authenticated ? (
        <div className="skeleton h-12" aria-busy="true" />
      ) : (
        <>
          <button type="button" className="btn btn-primary w-full" onClick={login}>
            <LogIn size={16} /> Continue
          </button>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <li className="flex items-center gap-1.5"><Mail size={13} /> Email code</li>
            <li className="flex items-center gap-1.5"><Wallet size={13} /> Wallet</li>
          </ul>
        </>
      )}
      
    </section>
  );
}
