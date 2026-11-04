import type { Metadata } from "next";
import { MarketCapCalc } from "@/components/tools/MarketCapCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("market-cap");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="market-cap">
      <MarketCapCalc />
    </ToolPage>
  );
}
