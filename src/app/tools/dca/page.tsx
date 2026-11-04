import type { Metadata } from "next";
import { DcaCalc } from "@/components/tools/DcaCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("dca");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="dca">
      <DcaCalc />
    </ToolPage>
  );
}
