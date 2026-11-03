import type { Metadata } from "next";
import { BookingWizard } from "@/components/promotion/BookingWizard";
import { PLACEMENTS, type PlacementId } from "@/lib/ads/catalog";

export const metadata: Metadata = { title: "Book a campaign" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ placement?: string }> }) {
  const { placement } = await searchParams;
  const initial = (PLACEMENTS.find((p) => p.id === placement)?.id ?? "hero") as PlacementId;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Book a campaign</h1>
        <p className="mt-1 text-soft">Pick where you appear, upload your creative, preview it in place, then pay.</p>
      </header>
      <BookingWizard initial={initial} />
    </div>
  );
}
