import { Calculator, CalendarClock, Coins, Droplets, Layers, Percent, ReceiptText, Scale, Target, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ToolIcon } from "@/lib/tools/registry";

const ICONS: Record<ToolIcon, LucideIcon> = { pnl: Calculator, position: Target, dca: Layers, mcap: Scale, recovery: Percent, il: Droplets, vesting: CalendarClock, staking: Coins, liquidation: TriangleAlert, costs: ReceiptText };

/** Flat line icon for a calculator. */
export function ToolGlyph({ icon, size = 22 }: { icon: ToolIcon; size?: number }) {
  const Icon = ICONS[icon];
  return <Icon size={size} aria-hidden="true" className="shrink-0 text-brand" />;
}
