# Legal notes for the owner

The pages at `/privacy`, `/terms` and `/about` are original drafts written to match what this product actually does. **Counsel must review all three before launch.** Nothing here is legal advice.

## Placeholders the owner must fill

| Item | Where | How |
| --- | --- | --- |
| Company legal name | all three pages, footer links | Set `NEXT_PUBLIC_COMPANY_NAME`. Falls back to "Crypto Gems". |
| Contact email | all three pages | Set `NEXT_PUBLIC_CONTACT_EMAIL`. When unset the pages say "the contact form in your dashboard" and show no address. Make sure that route exists, or set the email. |
| Jurisdiction and governing law | Terms, section "Governing law" | Replace the bracketed text in `src/app/terms/page.tsx`. |
| Refund terms | Terms, section "Payments, refunds and cancellation" | Replace the bracketed text. |
| Cancellation terms | same section | Replace the bracketed text. |
| Data retention periods | Privacy, section "Retention" | Replace the bracketed text. |
| Last updated date | `LAST_UPDATED` in `src/components/legal/LegalPage.tsx` | Update on every change. |

Each page also carries an HTML comment (`OWNER PLACEHOLDERS`) in its markup pointing at this file. The page copy shows only a small "Last updated" line, not a draft banner.

## Decisions

- Content states what is collected today: Privy user id, email or wallet as given to Privy, listing and campaign data, payment records, salted-hash ad events (no raw IP), Copilot messages sent to Anthropic, theme and language in local storage.
- Third parties named: Privy, Supabase (database and logo storage), NOWPayments, GeckoTerminal, CoinGecko, CoinMarketCap, Anthropic. Update the Privacy page whenever a provider is added.
- Logo uploads are stored in the public `logos` bucket under `<user id>/<uuid>.<ext>`. Uploaded logos are therefore public by design, which the Privacy page states.
- No text was copied from other sites.
- Footer got one added link line for the three pages because none existed.
