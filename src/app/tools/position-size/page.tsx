import type { Metadata } from "next";
import { PositionCalc } from "@/components/tools/PositionCalc";
import { ToolPage } from "@/components/tools/ToolPage";
import { toolBySlug } from "@/lib/tools/registry";

const tool = toolBySlug("position-size");

export const metadata: Metadata = { title: tool?.title, description: tool?.blurb };

export default function Page() {
  return (
    <ToolPage slug="position-size">
      <PositionCalc />
    </ToolPage>
  );
}
