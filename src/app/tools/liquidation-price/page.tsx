import type { Metadata } from "next";
import { LiquidationCalc } from "@/components/tools/LiquidationCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("liquidation-price");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="liquidation-price">
      <LiquidationCalc />
    </ToolPage>
  );
}
