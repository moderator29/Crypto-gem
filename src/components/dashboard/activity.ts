import { CreditCard, ListChecks, Megaphone, Rocket, type LucideIcon } from "lucide-react";
import type { Overview } from "./DashboardProvider";

export interface ActivityEvent { key: string; at: string; icon: LucideIcon; text: string; href: string }

const pretty = (s: string) => s.replace(/_/g, " ");
const usd = (n: number) => `$${Number(n).toLocaleString("en-US")}`;

/** Merge the person's real rows into one newest-first timeline. Rows with an unreadable date are skipped. */
export function buildActivity(data: Overview, limit = 8): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const s of data.submissions) out.push({ key: `s-${s.id}`, at: s.created_at, icon: ListChecks, text: `${s.name} (${s.symbol}) submitted for listing`, href: "/dashboard/listings" });
  for (const o of data.orders) {
    out.push({ key: `o-${o.id}`, at: o.created_at, icon: CreditCard, text: `${pretty(o.kind)} order created for ${usd(o.price_usd)}`, href: o.status === "pending" ? `/pay/${o.id}` : "/dashboard/payments" });
    if (o.paid_at) out.push({ key: `p-${o.id}`, at: o.paid_at, icon: CreditCard, text: `Payment of ${usd(o.price_usd)} received`, href: "/dashboard/payments" });
  }
  for (const b of data.boosts) if (b.starts_at) out.push({ key: `b-${b.id}`, at: b.starts_at, icon: Rocket, text: `${b.projectName ?? "Project"} boost (${b.pack_id}) ${b.status === "scheduled" ? "scheduled" : "started"}`, href: "/dashboard/boosts" });
  for (const c of data.campaigns) out.push({ key: `c-${c.id}`, at: c.starts_at, icon: Megaphone, text: `${c.headline ?? c.placement_id} campaign ${c.status === "scheduled" ? "scheduled" : "started"}`, href: "/dashboard/campaigns" });
  return out.filter((e) => Number.isFinite(Date.parse(e.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}
