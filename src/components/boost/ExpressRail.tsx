import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { ContactCard } from "@/components/ui/ContactCard";

/** Top-of-page rail pointing unlisted projects to Express Listing. Animated gradient border, mobile first. */
export function ExpressRail() {
  return (
    <section className="express-rail" aria-label="Express Listing">
      <div className="express-rail-inner flex min-w-0 flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="express-bolt grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"><Zap size={24} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="eyebrow">Express Listing</p>
            <h2 className="mt-1 text-lg font-bold leading-snug md:text-xl">Not listed yet? Express Listing gets your token live fast.</h2>
            <p className="mt-1 text-sm text-soft">Paste your contract, we detect the details, and your project goes to the front of the review queue.</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3 md:items-end">
          <Link href="/add-coin" className="btn btn-primary btn-lg w-full md:w-auto">Get listed fast <ArrowRight size={18} aria-hidden="true" /></Link>
          <ContactCard variant="inline" title="Questions?" />
        </div>
      </div>
    </section>
  );
}
