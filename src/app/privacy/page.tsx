import type { Metadata } from "next";
import { companyName, ContactLine, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

const OWNER_NOTE = "OWNER PLACEHOLDERS: company legal name (NEXT_PUBLIC_COMPANY_NAME), contact email (NEXT_PUBLIC_CONTACT_EMAIL), jurisdiction and data retention periods. Counsel must review before launch. See LEGAL_NOTES.md.";

export default function PrivacyPage() {
  const co = companyName();
  return (
    <LegalPage
      owner={OWNER_NOTE}
      title="Privacy Policy"
      intro={<p>This policy explains what {co} collects when you use the site, why, who we share it with and the choices you have. We keep collection to what the product needs.</p>}
      sections={[
        { id: "collect", title: "What we collect", body: (
          <>
            <p>Account data. There are no accounts. You never sign in, and we do not collect an email address or link a wallet to you.</p>
            <ul>
              <li>Listing and campaign data: project name, ticker, description, links, logo, contract address, contact email, chosen package and ad creative text and images.</li>
              <li>Payment records: the payment provider&apos;s payment id, amounts, currency, status and on-chain transaction hashes. We never see or store your private keys or seed phrase.</li>
              <li>Ad measurement: impression and click events. A visitor is identified only by a salted hash. We do not store your raw IP address.</li>
              <li>AI Copilot: the messages you send to Copilot, so a response can be produced.</li>
              <li>Basic technical logs kept by our hosting and database providers for security and reliability.</li>
            </ul>
          </>
        ) },
        { id: "use", title: "How we use it", body: (
          <ul>
            <li>To sign you in, create and review listings, run campaigns and process payments.</li>
            <li>To measure how ads perform and show advertisers real, not estimated, results.</li>
            <li>To answer Copilot questions you ask.</li>
            <li>To prevent abuse and fraud, to rate-limit requests, and to meet legal obligations.</li>
          </ul>
        ) },
        { id: "cookies", title: "Cookies and local storage", body: <p>We use browser storage only to remember your theme and language. We do not use advertising cookies or cross-site tracking.</p> },
        { id: "processors", title: "Who we share data with", body: (
          <>
            <p>We use these providers to run the service. Each receives only what its function needs.</p>
            <ul>
              <li>Supabase: database host for application data and public image storage for logos.</li>
              <li>NOWPayments: payment processing for listings and campaigns.</li>
              <li>GeckoTerminal, CoinGecko and CoinMarketCap: market data lookups. These requests carry contract addresses and search terms, not your account identity.</li>
              <li>Anthropic: Copilot messages are sent to Anthropic to generate replies. Do not put secrets or personal data in Copilot.</li>
            </ul>
            <p>We do not sell personal data.</p>
          </>
        ) },
        { id: "public", title: "What is public", body: <p>Listing details you submit, including name, ticker, description, links and logo, are shown to visitors once a listing is published. They are labelled as owner provided. Wallet addresses and transactions on public blockchains are public by nature.</p> },
        { id: "retention", title: "Retention", body: <p>We keep account, listing and payment records for as long as needed to provide the service and to meet accounting and legal duties. Ad event data is kept for reporting. Specific retention periods: [to be confirmed by {co}].</p> },
        { id: "rights", title: "Your choices and rights", body: <p>You can ask us to access, correct or delete your data, subject to records we must keep for legal reasons. Depending on where you live you may have additional rights, such as objecting to processing or lodging a complaint with a data protection authority. Contact us at <ContactLine />.</p> },
        { id: "security", title: "Security and transfers", body: <p>Data is stored with our database host and protected by access controls. Providers listed above may process data in other countries. No system is perfectly secure, so please protect your own sign-in methods.</p> },
        { id: "children", title: "Children", body: <p>The service is not intended for anyone under 18 and we do not knowingly collect their data.</p> },
        { id: "changes", title: "Changes and contact", body: <p>We will update this page when practices change and revise the date at the top. Questions go to <ContactLine />.</p> },
      ]}
    />
  );
}
