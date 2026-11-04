"use client";

import { LogIn, Mail, ShieldCheck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GemMark } from "@/components/ui/Logo";
import { useAuth } from "./AuthProvider";

export function LoginPanel({ next }: { next: string }) {
  const { configured, ready, authenticated, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authenticated) router.replace(next);
  }, [authenticated, next, router]);

  return (
    <section className="card card-lit fx-pop relative space-y-5 overflow-hidden p-6 md:p-8" aria-label="Sign in">
      <div className="fx-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="relative z-10 space-y-4">
        <span className="fx-float inline-block"><GemMark size={44} /></span>
        <div>
          <h1 className="h1">Sign in</h1>
          <p className="mt-2 text-sm text-soft">Use an email code, your wallet, or Google. No password, and no wallet is created for you.</p>
        </div>
        {!configured ? (
          <p className="card-flat p-3 text-sm text-warm" role="status">Sign-in is not configured in this environment yet (Privy app id missing).</p>
        ) : !ready || authenticated ? (
          <div className="skeleton h-12" aria-busy="true" />
        ) : (
          <>
            <button type="button" className="btn btn-primary btn-lg w-full" onClick={login}>
              <LogIn size={16} aria-hidden="true" /> Continue
            </button>
            <ul className="stagger flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
              <li className="flex items-center gap-1.5"><Mail size={13} aria-hidden="true" /> Email code</li>
              <li className="flex items-center gap-1.5"><Wallet size={13} aria-hidden="true" /> Wallet</li>
              <li className="flex items-center gap-1.5"><ShieldCheck size={13} aria-hidden="true" /> Non-custodial</li>
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
