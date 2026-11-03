"use client";

import { Activity, CreditCard, Image as ImageIcon, LayoutDashboard, ListChecks, ScrollText, ShieldAlert, Tags, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { ACCESS, hasAnyRole, type StaffRole } from "@/lib/admin/roles";
import { authConfigured } from "@/lib/auth/client";
import { useAdminQuery } from "./api";
import { Loading, Notice } from "./ui";

interface Me {
  id: string;
  email: string | null;
  roles: StaffRole[];
}

const Ctx = createContext<Me | null>(null);

/** The signed-in staff member. Only available inside the shell once access has been confirmed. */
export function useAdmin(): Me {
  const me = useContext(Ctx);
  if (!me) throw new Error("useAdmin must be used inside AdminShell");
  return me;
}

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ACCESS.overview },
  { href: "/admin/listings", label: "Listings", icon: ListChecks, roles: ACCESS.listingsRead },
  { href: "/admin/prices", label: "Prices", icon: Tags, roles: ACCESS.pricesRead },
  { href: "/admin/payment-methods", label: "Methods", icon: Wallet, roles: ACCESS.paymentMethods },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, roles: ACCESS.payments },
  { href: "/admin/creatives", label: "Creatives", icon: ImageIcon, roles: ACCESS.creatives },
  { href: "/admin/audit", label: "Audit", icon: ScrollText, roles: ACCESS.audit },
] as const;

/**
 * Admin frame. It asks the server who the user is (`/api/admin/me`) and shows a no-access state for
 * anyone without a staff role. Hiding navigation is a convenience: every route re-checks on the server.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const configured = authConfigured();
  const me = useAdminQuery<Me>(configured ? "/api/admin/me" : null);

  let body: ReactNode;
  if (!configured) {
    body = <Notice>Sign-in is not configured in this environment (Privy app id missing), so the admin area cannot sign anyone in.</Notice>;
  } else if (me.loading) {
    body = <Loading />;
  } else if (me.status === 401) {
    body = (
      <Gate title="Sign in required" text="The admin area is for staff. Sign in with your staff account to continue.">
        <Link href="/login?next=/admin" className="btn btn-primary">Sign in</Link>
      </Gate>
    );
  } else if (me.status === 503) {
    body = <Notice>The server is missing its database configuration, so admin access cannot be checked.</Notice>;
  } else if (me.error || !me.data) {
    body = <Notice tone="error">{me.error ?? "Could not check your access."}</Notice>;
  } else if (me.data.roles.length === 0) {
    body = <Gate title="No access" text={`${me.data.email ?? "This account"} does not have a staff role. Ask a super admin to grant one.`} />;
  } else {
    const visible = NAV.filter((n) => hasAnyRole(me.data!.roles, n.roles));
    body = (
      <Ctx.Provider value={me.data}>
        <nav aria-label="Admin sections" className="scroll-x -mx-4 mb-5 px-4">
          {visible.map((n) => {
            const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className="chip shrink-0" aria-current={active ? "step" : undefined}>
                <n.icon size={15} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </Ctx.Provider>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-clip">
      <div className="mb-3 flex items-center gap-2 text-sm text-muted">
        <Activity size={15} /> Staff area
        {me.data && me.data.roles.length > 0 && <span className="min-w-0 truncate">{me.data.roles.map((r) => r.replaceAll("_", " ")).join(", ")}</span>}
      </div>
      {body}
    </div>
  );
}

function Gate({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="glass mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
      <ShieldAlert size={28} className="text-warm" />
      <h1 className="font-display text-xl font-bold">{title}</h1>
      <p className="text-sm text-soft">{text}</p>
      {children}
    </div>
  );
}
