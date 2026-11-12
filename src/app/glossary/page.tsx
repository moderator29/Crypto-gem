import type { Metadata } from "next";
import { GlossaryView } from "@/components/engage/GlossaryView";
import { PageHeader } from "@/components/ui/PageHeader";
import { GLOSSARY } from "@/lib/content/glossary";

export const metadata: Metadata = { title: "Crypto glossary", description: "Plain-language definitions of crypto terms such as liquidity, slippage, FDV, vesting, MEV and impermanent loss, with related terms and direct links." };

export default function GlossaryPage() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const ld = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Crypto glossary",
    url: `${site}/glossary`,
    hasDefinedTerm: GLOSSARY.map((t) => ({ "@type": "DefinedTerm", name: t.term, description: t.definition, url: `${site}/glossary#${t.slug}`, inDefinedTermSet: `${site}/glossary` })),
  };
  return (
    <div className="mx-auto w-full max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <PageHeader eyebrow="Glossary" title="Crypto terms, in plain words" description="Short definitions for the words used across the guides and tools. Search, jump by letter, or open a term from a link." />
      <GlossaryView terms={GLOSSARY} />
    </div>
  );
}
