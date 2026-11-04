"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogIn, LogOut, Mail, Unlink, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { playSound } from "@/components/fx/sound";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tip } from "@/components/ui/Tip";
import { useToast } from "@/components/ui/Toast";
import { canUnlink } from "@/lib/settings";
import { PreferencesGroups } from "./PreferencesGroups";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 md:p-6" aria-label={title}>
      <h2 className="h3">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

interface Linked { type: string; address?: string; subject?: string; email?: string; name?: string }
interface MethodRow { key: string; acct: Linked; label: string; leaving?: boolean }
const METHOD_TYPES = ["email", "wallet", "google_oauth"];

const toRow = (a: Linked): MethodRow => ({
  key: `${a.type}-${a.address ?? a.subject}`,
  acct: a,
  label: a.type === "email" ? (a.address ?? "Email") : a.type === "wallet" ? `${a.address?.slice(0, 6)}…${a.address?.slice(-4)}` : a.email ?? a.name ?? "Google account",
});

/** Keeps removed rows on screen for one short exit animation, in their original place, then drops them. */
function useMethodRows(accounts: Linked[]): MethodRow[] {
  const current = useMemo(() => accounts.filter((a) => METHOD_TYPES.includes(a.type)).map(toRow), [accounts]);
  const sig = current.map((r) => r.key).join("|");
  const [snap, setSnap] = useState<{ sig: string; rows: MethodRow[] }>({ sig, rows: current });
  if (snap.sig !== sig) {
    const keep = snap.rows.filter((r) => !r.leaving).map((r) => (current.some((c) => c.key === r.key) ? current.find((c) => c.key === r.key)! : { ...r, leaving: true }));
    const added = current.filter((c) => !keep.some((k) => k.key === c.key));
    setSnap({ sig, rows: [...keep, ...added] });
  }
  const leaving = snap.rows.some((r) => r.leaving);
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setSnap((s) => ({ ...s, rows: s.rows.filter((r) => !r.leaving) })), 300);
    return () => clearTimeout(id);
  }, [leaving, snap.sig]);
  return snap.rows;
}

const NAV = [
  { id: "profile", label: "Profile" },
  { id: "sign-in", label: "Sign-in methods" },
  { id: "preferences", label: "Preferences" },
  { id: "session", label: "Session" },
] as const;

/** Section list for wide screens. The link for the section in view is highlighted as you scroll. */
function SectionNav() {
  const [active, setActive] = useState<string>(NAV[0].id);
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter((e): e is HTMLElement => e !== null);
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: "-20% 0px -65% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <nav aria-label="Settings sections" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
      <ul className="space-y-1">
        {NAV.map((n) => (
          <li key={n.id}>
            <a href={`#${n.id}`} aria-current={active === n.id ? "true" : undefined} className={`block rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${active === n.id ? "bg-[var(--surface-3)] text-text" : "text-muted hover:text-text"}`}>{n.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Uses Privy hooks, so it is only rendered when sign-in is configured and the user is authenticated. */
function Account() {
  const { user, linkEmail, linkWallet, linkGoogle, unlinkEmail, unlinkWallet, unlinkGoogle, logout } = usePrivy();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const accounts = (user?.linkedAccounts ?? []) as Linked[];
  const removable = canUnlink(accounts);
  const rows = useMethodRows(accounts);

  const run = async (key: string, fn: () => Promise<unknown> | void, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      playSound("success");
    } catch {
      playSound("error");
      toast.error("That did not complete", "You may have closed the window, or the provider declined. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
    <SectionNav />
    <div className="min-w-0 space-y-4">
      <Section id="profile" title="Profile">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="eyebrow">User ID</dt>
            <dd className="mt-2 flex items-center gap-2"><span className="num truncate font-semibold">{user?.id ?? "n/a"}</span>{user?.id && <CopyButton value={user.id} label="Copy" what="User ID copied" />}</dd>
          </div>
          <div>
            <dt className="eyebrow">Email</dt>
            <dd className="mt-2 flex items-center gap-2"><span className="min-w-0 truncate font-semibold">{user?.email?.address ?? user?.google?.email ?? "Not linked"}</span>{(user?.email?.address ?? user?.google?.email) && <CopyButton value={(user?.email?.address ?? user?.google?.email) as string} label="Copy" what="Email copied" />}</dd>
          </div>
        </dl>
      </Section>

      <Section id="sign-in" title="Sign-in methods" description="Link more than one so you can always get back in. The last method cannot be removed.">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-soft"><span className="num">{rows.filter((r) => !r.leaving).length}</span> linked{!removable && <Tip label="Why can I not remove it?">Add another sign-in method first. The last one stays so you can never lock yourself out.</Tip>}</p>
        <ul className="divide-y divide-[var(--line-1)]">
          {rows.map(({ key, acct: a, label, leaving }) => {
            const Icon = a.type === "wallet" ? Wallet : Mail;
            const busyKey = `u-${key}`;
            return (
              <li key={key} className="method-row flex items-center justify-between gap-3 py-3" data-leaving={leaving ? "true" : undefined}>
                <span className="flex min-w-0 items-center gap-3"><Icon size={17} className="shrink-0 text-muted" aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{label}</span><span className="flex items-center gap-1.5 text-xs capitalize text-muted"><span className="status-dot" aria-hidden="true" />{a.type === "google_oauth" ? "Google" : a.type} · Active</span></span></span>
                <Button size="sm" variant="ghost" disabled={!removable || leaving} loading={busy === busyKey} title={removable ? "Remove this sign-in method" : "Add another method before removing this one"} onClick={() => run(busyKey, () => (a.type === "email" ? unlinkEmail(a.address as string) : a.type === "wallet" ? unlinkWallet(a.address as string) : unlinkGoogle(a.subject as string)), "Sign-in method removed")}><Unlink size={14} /> Remove</Button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" loading={busy === "l-email"} onClick={() => run("l-email", () => linkEmail(), "Email linked")}><Mail size={14} /> Link email</Button>
          <Button size="sm" loading={busy === "l-wallet"} onClick={() => run("l-wallet", () => linkWallet(), "Wallet linked")}><Wallet size={14} /> Link wallet</Button>
          <Button size="sm" loading={busy === "l-google"} onClick={() => run("l-google", () => linkGoogle(), "Google linked")}>Link Google</Button>
        </div>
        <p className="mt-3 text-xs text-muted">Linking a wallet here proves you control it. Crypto Gems never holds your keys or funds.</p>
      </Section>

      <div id="preferences" className="scroll-mt-24"><PreferencesGroups /></div>

      <Section id="session" title="Session">
        <Button variant="danger" onClick={() => void logout()}><LogOut size={15} /> Sign out</Button>
      </Section>
    </div>
    </div>
  );
}

export function SettingsView() {
  const { configured, ready, authenticated, login } = useAuth();
  if (!configured) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <EmptyState title="Sign-in is not configured here" description="Account settings appear once sign-in is connected for this site." />
        <PreferencesGroups />
      </div>
    );
  }
  if (!ready) return <div className="skeleton h-56" aria-busy="true" />;
  if (!authenticated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <EmptyState icon={LogIn} title="Sign in to manage your account" description="Use an email code, a wallet or Google." action={<Button variant="primary" onClick={login}>Sign in</Button>} />
        <PreferencesGroups />
      </div>
    );
  }
  return <Account />;
}
