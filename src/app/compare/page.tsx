import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/compare/CompareView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Compare tokens", description: "Overlay up to three tokens over the last 7 days." };

export default function ComparePage() {
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Compare" }]} eyebrow="Tools" title="Compare tokens" description="Pick up to three tokens and see their last 7 days rebased to the same start." />
      <Suspense fallback={<div className="skeleton h-64" />}><CompareView /></Suspense>
    </div>
  );
}
