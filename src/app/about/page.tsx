import type { Metadata } from "next";
import Link from "next/link";
import { companyName, ContactLine, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "About" };

const OWNER_NOTE = "OWNER PLACEHOLDERS: company legal name (NEXT_PUBLIC_COMPANY_NAME) and contact email (NEXT_PUBLIC_CONTACT_EMAIL). Counsel must review before launch. See LEGAL_NOTES.md.";

export default function AboutPage() {
  const co = companyName();
  return (
    <LegalPage
      owner={OWNER_NOTE}
      title={`About ${co}`}
      intro={<p>{co} helps people find crypto tokens and helps projects get seen, with clear labels for what is organic and what is paid.</p>}
      sections={[
        { id: "what", title: "What we do", body: <p>We show live market data for tokens across many chains, let projects submit listings, and sell visibility through boosts and ad placements. An AI Copilot answers questions about tokens and markets.</p> },
        { id: "data", title: "Where data comes from", body: <p>Market data comes from GeckoTerminal, CoinGecko and CoinMarketCap. When a provider has no data we show an empty state, never an invented number.</p> },
        { id: "organic", title: "Organic versus sponsored", body: <p>Organic rankings come from market data. Sponsored placements are always labelled and never change organic order. Payment does not verify a project or guarantee approval.</p> },
        { id: "noncustodial", title: "Non-custodial", body: <p>We never hold your keys or funds and we do not execute trades. Sign-in uses Privy, and trades happen on external venues with your own wallet.</p> },
        { id: "contact", title: "Contact", body: <p>Reach us at <ContactLine />. Read our <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.</p> },
      ]}
    />
  );
}
