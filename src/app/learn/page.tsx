import type { Metadata } from "next";
import { LearnIndex } from "@/components/learn/LearnIndex";
import { PageHeader } from "@/components/ui/PageHeader";
import { ARTICLES, readingMinutes } from "@/lib/content/learn";

export const metadata: Metadata = { title: "Learn", description: "Plain-language guides to rug pulls, liquidity, slippage, wallet safety and how rankings and sponsored placements work on Crypto Gems." };

export default function LearnPage() {
  const cards = ARTICLES.map((a) => ({ slug: a.slug, title: a.title, summary: a.summary, category: a.category, minutes: readingMinutes(a), text: `${a.title} ${a.summary}`.toLowerCase() + " " + a.blocks.map((b) => ("text" in b ? b.text : "items" in b ? b.items.join(" ") : "")).join(" ").toLowerCase() }));
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader eyebrow="Learn" title="Understand the market before you trade it" description="Short, practical guides on the risks and mechanics behind the numbers. Written for people, not for search engines." />
      <LearnIndex articles={cards} />
    </div>
  );
}
