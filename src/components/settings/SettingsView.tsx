"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogIn, LogOut, Mail, Unlink, Wallet } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { canUnlink } from "@/lib/settings";
import { PreferencesGroups } from "./PreferencesGroups";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-6" aria-label={title}>
      <h2 className="h3">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Uses Privy hooks, so it is only rendered when sign-in is configured and the user is authenticated. */
function Account() {
  const { user, linkEmail, linkWallet, linkGoogle, unlinkEmail, unlinkWallet, unlinkGoogle, logout } = usePrivy();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const accounts = (user?.linkedAccounts ?? []) as Array<{ type: string; address?: string; subject?: string; email?: string; name?: string }>;
  const removable = canUnlink(accounts);

  const run = async (key: string, fn: () => Promise<unknown> | void, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch {
      toast.error("That did not complete", "You may have closed the window, or the provider declined. Nothing was changed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Profile">
        <dl className="grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="eyebrow">User ID</dt>
            <dd className="mt-2 flex items-center gap-2"><span className="num truncate font-semibold">{user?.id ?? "n/a"}</span>{user?.id && <CopyButton value={user.id} label="Copy" what="User ID copied" />}</dd>
          </div>
          <div>
            <dt className="eyebrow">Email</dt>
            <dd className="mt-2 font-semibold">{user?.email?.address ?? user?.google?.email ?? "Not linked"}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Sign-in methods" description="Link more than one so you can always get back in. The last method cannot be removed.">
        <ul className="divide-y divide-[var(--line-1)]">
          {accounts.filter((a) => ["email", "wallet", "google_oauth"].includes(a.type)).map((a) => {
            const label = a.type === "email" ? a.address : a.type === "wallet" ? `${a.address?.slice(0, 6)}…${a.address?.slice(-4)}` : a.email ?? a.name ?? "Google account";
            const Icon = a.type === "wallet" ? Wallet : Mail;
            return (
              <li key={`${a.type}-${a.address ?? a.subject}`} className="flex items-center justify-between gap-3 py-3">
                <span className="flex min-w-0 items-center gap-3"><Icon size={17} className="shrink-0 text-muted" aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{label}</span><span className="block text-xs capitalize text-muted">{a.type === "google_oauth" ? "Google" : a.type}</span></span></span>
                <Button size="sm" variant="ghost" disabled={!removable} loading={busy === `u-${a.type}-${a.address ?? a.subject}`} title={removable ? "Remove this sign-in method" : "Add another method before removing this one"} onClick={() => run(`u-${a.type}-${a.address ?? a.subject}`, () => (a.type === "email" ? unlinkEmail(a.address as string) : a.type === "wallet" ? unlinkWallet(a.address as string) : unlinkGoogle(a.subject as string)), "Sign-in method removed")}><Unlink size={14} /> Remove</Button>
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

      <PreferencesGroups />

      <Section title="Session">
        <Button variant="danger" onClick={() => void logout()}><LogOut size={15} /> Sign out</Button>
      </Section>
    </div>
  );
}

export function SettingsView() {
  const { configured, ready, authenticated, login } = useAuth();
  if (!configured) {
    return (
      <div className="space-y-4">
        <EmptyState title="Sign-in is not configured here" description="Account settings appear once sign-in is connected for this site." />
        <PreferencesGroups />
      </div>
    );
  }
  if (!ready) return <div className="skeleton h-56" aria-busy="true" />;
  if (!authenticated) {
    return (
      <div className="space-y-4">
        <EmptyState icon={LogIn} title="Sign in to manage your account" description="Use an email code, a wallet or Google." action={<Button variant="primary" onClick={login}>Sign in</Button>} />
        <PreferencesGroups />
      </div>
    );
  }
  return <Account />;
}
