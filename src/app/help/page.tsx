import { BookA, BookOpen, Bot, Mail, Activity } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HelpCenter } from "@/components/learn/HelpCenter";
import { PageHeader } from "@/components/ui/PageHeader";
import { FAQS } from "@/lib/content/help";

export const metadata: Metadata = { title: "Help", description: "Answers about listings, Boost, banners, payments, accounts and data on CryptoGemCN." };

const OPTIONS = [
  { href: "/contact", icon: Mail, title: "Contact us", text: "Send a message by email and include your order number if you have one." },
  { href: "/copilot", icon: Bot, title: "Ask Copilot", text: "Questions about a token or the market. It can be wrong, so verify." },
  { href: "/learn", icon: BookOpen, title: "Read the guides", text: "Plain-language explanations of risks and how rankings work." },
  { href: "/glossary", icon: BookA, title: "Glossary", text: "Plain definitions of crypto terms, searchable from A to Z." },
  { href: "/status", icon: Activity, title: "Data status", text: "Check whether market data sources are working right now." },
];

export default function HelpPage() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="mx-auto w-full max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <PageHeader eyebrow="Help" title="How can we help?" description="Search the answers below, or pick a way to reach us." />
      <HelpCenter faqs={FAQS} />
      <section className="mt-10" aria-labelledby="reach-h">
        <h2 id="reach-h" className="h2 mb-4">Still stuck?</h2>
        <ul className="stagger grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <li key={o.href}>
              <Link href={o.href} className="card hover-lift flex h-full gap-3.5 p-4">
                <span className="icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-xl"><o.icon size={19} aria-hidden="true" /></span>
                <span className="min-w-0"><span className="block font-semibold">{o.title}</span><span className="mt-0.5 block text-sm text-soft">{o.text}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
