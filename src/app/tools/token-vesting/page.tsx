import type { Metadata } from "next";
import { VestingCalc } from "@/components/tools/VestingCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("token-vesting");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="token-vesting">
      <VestingCalc />
    </ToolPage>
  );
}
