import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/learn/ContactForm";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with the Crypto Gems team." };

export default function ContactPage() {
  const to = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader eyebrow="Contact" title="Talk to us" description="Questions about a listing, an order or the data? Write it down here and we will reply by email." />
      <ContactForm to={to} />
      <p className="mt-4 text-sm text-soft">Looking for a quick answer? Try the <Link className="font-semibold text-brand" href="/help">help centre</Link> first.</p>
    </div>
  );
}
