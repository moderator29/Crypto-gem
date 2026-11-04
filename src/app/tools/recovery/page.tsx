import type { Metadata } from "next";
import { RecoveryCalc } from "@/components/tools/RecoveryCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("recovery");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="recovery">
      <RecoveryCalc />
    </ToolPage>
  );
}
