import type { Metadata } from "next";
import { companyName, ContactLine, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of Service" };

const OWNER_NOTE = "OWNER PLACEHOLDERS: company legal name, contact email, governing law and jurisdiction, refund and cancellation terms. Counsel must review before launch. See LEGAL_NOTES.md.";

export default function TermsPage() {
  const co = companyName();
  return (
    <LegalPage
      owner={OWNER_NOTE}
      title="Terms of Service"
      intro={<p>These terms govern your use of {co}. By using the site, creating a listing or booking an ad you agree to them. If you do not agree, do not use the service.</p>}
      sections={[
        { id: "service", title: "The service", body: <p>{co} is a market discovery and promotion site for crypto tokens. It lists tokens, shows market data, sells visibility packages and ad placements, and offers an AI Copilot for questions.</p> },
        { id: "advice", title: "No financial advice", body: <p>Nothing on the site is financial, investment, legal or tax advice, or an offer or recommendation to buy or sell anything. Crypto assets are volatile and you can lose all of your money. Do your own research and decide for yourself. Copilot answers can be wrong.</p> },
        { id: "data", title: "Data accuracy", body: <ul><li>Market data comes from third parties and is informational only. It can be delayed, incomplete or wrong.</li><li>Prices on decentralized exchanges differ by pool and venue, and from prices on other sites.</li><li>Project descriptions and links are supplied by project owners and are not verified by us unless we say so.</li></ul> },
        { id: "noncustodial", title: "Non-custodial, no trading", body: <p>We never hold your funds or private keys and we do not execute trades. Any trade happens on an external venue using your own wallet, and you are responsible for it. Payments to us for listings and ads are made through our payment provider.</p> },
        { id: "listing", title: "Listings and verification", body: <ul><li>Listing and verification are separate from payment. Paying for a package does not guarantee approval, verification or any ranking.</li><li>We review submissions and may approve, reject, edit or remove a listing at our discretion.</li><li>You confirm you have the right to list the project and that your information is accurate.</li></ul> },
        { id: "sponsored", title: "Sponsored placements", body: <p>Paid placements and boosts are labelled as sponsored. They do not affect organic ranking. Ad statistics shown to advertisers are measured from real events.</p> },
        { id: "payments", title: "Payments, refunds and cancellation", body: (
          <>
            <p>Prices are shown before you pay and are set by {co}. Crypto payments are final once confirmed on chain unless stated below.</p>
            <p><strong>Refund policy: [to be confirmed by {co}].</strong> <strong>Cancellation policy: [to be confirmed by {co}].</strong> Until these are published, contact <ContactLine /> about any payment issue.</p>
          </>
        ) },
        { id: "prohibited", title: "Prohibited content and conduct", body: <ul><li>Scams, rug pulls, impersonation, fake or misleading claims, or promises of guaranteed returns.</li><li>Illegal content, malware, phishing, or content that infringes the rights of others.</li><li>Manipulating ad measurement, abusing the API, or interfering with the service.</li><li>Submitting data you do not have the right to share.</li></ul> },
        { id: "termination", title: "Suspension and termination", body: <p>We may suspend or remove listings, campaigns or accounts that break these terms or create risk for users. You may stop using the service at any time.</p> },
        { id: "liability", title: "Disclaimers and limitation of liability", body: <p>The service is provided as is and as available, without warranties of any kind to the extent the law allows. To the extent the law allows, {co} is not liable for indirect or consequential loss, lost profits, or trading losses, and our total liability for any claim is limited to the amount you paid us in the three months before the claim. Some places do not allow these limits, so they apply only as far as the law permits.</p> },
        { id: "law", title: "Governing law", body: <p>Governing law and jurisdiction: [to be confirmed by {co}].</p> },
        { id: "changes", title: "Changes and contact", body: <p>We may update these terms and will change the date above. Continued use means you accept the update. Contact: <ContactLine />.</p> },
      ]}
    />
  );
}
