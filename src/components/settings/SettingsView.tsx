"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogIn, LogOut, Mail, Unlink, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { LOCALE_COOKIE, LOCALES } from "@/lib/i18n/config";
import { canUnlink } from "@/lib/settings";
import { useT } from "@/components/i18n/I18nProvider";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 md:p-6" aria-label={title}>
      <h2 className="h3">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Preferences() {
  const { locale } = useT();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const id = setTimeout(() => setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"), 0);
    return () => clearTimeout(id);
  }, []);
  const apply = (t: "dark" | "light") => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("cg-theme", t);
    } catch {
      /* storage unavailable: the choice still applies for this visit */
    }
    setTheme(t);
  };
  return (
    <Section title="Preferences" description="Stored in this browser.">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">Theme</p>
          <div className="flex gap-2" role="group" aria-label="Theme">
            {(["dark", "light"] as const).map((t) => (
              <button key={t} type="button" className="chip capitalize" aria-pressed={theme === t} onClick={() => apply(t)}>{t}</button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Language</span>
          <select
            className="input"
            value={locale}
            onChange={(e) => {
              document.cookie = `${LOCALE_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
              router.refresh();
            }}
          >
            {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <span className="mt-1.5 block text-xs text-muted">Navigation and discovery labels are translated. Other pages are English for now.</span>
        </label>
      </div>
    </Section>
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

      <Preferences />

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
        <Preferences />
      </div>
    );
  }
  if (!ready) return <div className="skeleton h-56" aria-busy="true" />;
  if (!authenticated) {
    return (
      <div className="space-y-4">
        <EmptyState icon={LogIn} title="Sign in to manage your account" description="Use an email code, a wallet or Google." action={<Button variant="primary" onClick={login}>Sign in</Button>} />
        <Preferences />
      </div>
    );
  }
  return <Account />;
}
