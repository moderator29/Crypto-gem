import type { Metadata } from "next";
import { CostCalc } from "@/components/tools/CostCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("fee-slippage");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="fee-slippage">
      <CostCalc />
    </ToolPage>
  );
}
