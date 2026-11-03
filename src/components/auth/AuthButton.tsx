"use client";

import { Copy, LogIn, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

/** Header account control: Sign in, or an account menu once authenticated. Renders nothing when sign-in is not configured. */
export function AuthButton({ className = "" }: { className?: string }) {
  const { configured, ready, authenticated, label, userId, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!configured) return null;
  if (!ready) return <span className={`skeleton h-11 w-24 ${className}`} aria-hidden="true" />;
  if (!authenticated) {
    return (
      <button type="button" className={`btn ${className}`} onClick={login}>
        <LogIn size={16} /> Sign in
      </button>
    );
  }
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" className="btn max-w-[180px]" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <UserRound size={16} /> <span className="truncate">{label ?? "Account"}</span>
      </button>
      {open && (
        <div role="menu" className="glass absolute right-0 top-[calc(100%+8px)] z-[90] w-56 space-y-1 !bg-[var(--surface-solid)] p-2">
          <Link role="menuitem" href="/dashboard" className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-[var(--border)]" onClick={() => setOpen(false)}>Dashboard</Link>
          {userId && (
            <button role="menuitem" type="button" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold hover:bg-[var(--border)]" onClick={() => { void navigator.clipboard?.writeText(userId); setOpen(false); }}>
              <Copy size={15} /> Copy user ID
            </button>
          )}
          <button role="menuitem" type="button" className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-down hover:bg-[var(--border)]" onClick={() => { setOpen(false); void logout(); }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
