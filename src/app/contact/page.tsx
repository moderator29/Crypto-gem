import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/ui/NavIcon";
import { ContactForm } from "@/components/learn/ContactForm";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with the CryptoGemCN team." };

export default function ContactPage() {
  const to = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader eyebrow="Contact" title="Talk to us" description="Questions about a listing, an order or the data? Message an admin on Telegram for the fastest answer, or write it down here." />
      <section className="mb-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2" aria-label="Message the team on Telegram">
        {SITE.admins.map((a) => (
          <a key={a.handle} href={a.url} target="_blank" rel="noopener noreferrer" className="card hover-lift flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--brand)_16%,transparent)] text-brand"><NavIcon name="inbox" size={22} /></span>
            <span className="min-w-0"><span className="block font-semibold">{a.label}</span><span className="block text-xs text-muted">Message on Telegram</span></span>
          </a>
        ))}
        <a href={SITE.telegramChannel} target="_blank" rel="noopener noreferrer" className="btn">Telegram channel</a>
        <a href={SITE.weibo} target="_blank" rel="noopener noreferrer" className="btn">Weibo</a>
      </section>
      <ContactForm to={to} />
      <p className="mt-4 text-sm text-soft">Looking for a quick answer? Try the <Link className="font-semibold text-brand" href="/help">help centre</Link> first.</p>
    </div>
  );
}
