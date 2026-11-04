import type { Metadata } from "next";
import { IlCalc } from "@/components/tools/IlCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("impermanent-loss");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="impermanent-loss">
      <IlCalc />
    </ToolPage>
  );
}
