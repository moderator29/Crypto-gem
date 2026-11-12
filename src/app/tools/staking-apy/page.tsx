import type { Metadata } from "next";
import { StakingCalc } from "@/components/tools/StakingCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("staking-apy");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="staking-apy">
      <StakingCalc />
    </ToolPage>
  );
}
