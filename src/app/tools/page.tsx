import type { Metadata } from "next";
import { ToolsHub } from "@/components/tools/ToolsHub";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Trader tools", description: "Free calculators for profit and loss, position size, DCA, market cap scenarios, break-even and impermanent loss." };

export default function ToolsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader eyebrow="Trader tools" title="Calculators that show their work" description="Six small tools for the maths traders do all the time. Results update as you type, and every page explains the formula it uses." />
      <ToolsHub />
      <p className="mt-6 rounded-[var(--r-md)] border border-line bg-[var(--surface-2)] px-4 py-3 text-xs leading-relaxed text-muted">
        Educational use only, not financial advice. The tools use only the numbers you enter. They never pull live prices and cannot predict a market.
      </p>
    </div>
  );
}
