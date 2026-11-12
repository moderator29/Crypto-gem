import type { Metadata } from "next";
import { Suspense } from "react";
import { CompareView } from "@/components/compare/CompareView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Compare tokens", description: "Overlay up to five tokens over 24 hours or 7 days." };

export default function ComparePage() {
  return (
    <div>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Compare" }]} eyebrow="Tools" title="Compare tokens" description="Pick up to five tokens, see them rebased to the same start, read every line at the same moment and share the exact view by link." />
      <Suspense fallback={<div className="skeleton h-64" />}><CompareView /></Suspense>
    </div>
  );
}
