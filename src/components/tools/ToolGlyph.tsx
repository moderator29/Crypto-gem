import { Calculator, Droplets, Layers, Percent, Scale, Target, type LucideIcon } from "lucide-react";
import type { ToolIcon } from "@/lib/tools/registry";

const ICONS: Record<ToolIcon, LucideIcon> = { pnl: Calculator, position: Target, dca: Layers, mcap: Scale, recovery: Percent, il: Droplets };

/** Flat line icon for a calculator. */
export function ToolGlyph({ icon, size = 22 }: { icon: ToolIcon; size?: number }) {
  const Icon = ICONS[icon];
  return <Icon size={size} aria-hidden="true" className="shrink-0 text-brand" />;
}
