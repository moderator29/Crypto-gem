import type { Metadata } from "next";
import { PnlCalc } from "@/components/tools/PnlCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("profit-loss");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="profit-loss">
      <PnlCalc />
    </ToolPage>
  );
}
