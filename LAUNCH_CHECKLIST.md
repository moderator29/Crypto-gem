# Launch checklist

Everything the owner has to supply or decide before Crypto Gems can take real traffic and real money. The code for every item below is written and tested with fakes. Nothing has run against live Privy, Supabase, NOWPayments, CoinMarketCap or Anthropic because none of those credentials exist in the build environment.

## 1. Vercel environment variables

Set these in Vercel, Project Settings, Environment Variables. Mark every one without the `NEXT_PUBLIC_` prefix as server only.

### Required to take orders

| Name | Where to get it | Used for |
| --- | --- | --- |
| `NEXT_PUBLIC_PRIVY_APP_ID` | dashboard.privy.io, your app, App ID | Sign-in (email code, wallet, Google). Also used by the server to verify access tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project Settings, API | All business data and file storage: listings, orders, payments, campaigns, boosts, watchlists, votes, ad creatives, logos |
| `SUPABASE_SECRET_KEY` | Supabase, Project Settings, API keys (secret key) | Server-side access that bypasses RLS after the Privy token is verified. Server only |
| `NOWPAYMENTS_API_KEY` | nowpayments.io dashboard, Store settings | Creating payments |
| `NOWPAYMENTS_IPN_SECRET` | Same dashboard, Payments, IPN secret | Verifying payment webhooks |
| `NOWPAYMENTS_SANDBOX` | You set it: `true` while testing, `false` in production | Selects the sandbox or live API |
| `CRON_SECRET` | You generate a long random string | Protects `/api/cron/maintenance`. Vercel sends it as a Bearer token to cron routes |
| `NEXT_PUBLIC_SITE_URL` | Your production URL, for example `https://yourdomain.com` | Webhook callback URL, sitemap, share image |
| `AD_HASH_SALT` | You generate a long random string | Salt for hashing visitors in ad measurement. Change it and unique-visitor counts reset |

### Strongly recommended

| Name | Where to get it | Used for |
| --- | --- | --- |
| `COINGECKO_API_KEY` | coingecko.com/api | Higher limits, metadata and links in detection |
| `COINGECKO_API_PLAN` | `demo` or `pro` | Chooses the CoinGecko host. A `pro` key also moves GeckoTerminal calls to the paid onchain host |
| `COINMARKETCAP_API_KEY` | pro.coinmarketcap.com | CoinMarketCap data in token detection. Detection reports "not configured" without it |
| `ANTHROPIC_API_KEY` | console.anthropic.com | AI Copilot. The page shows "offline" without it |
| `AI_MODEL` | optional | Overrides the default Copilot model |
| `RPC_ETHEREUM`, `RPC_BSC`, `RPC_BASE`, `RPC_ARBITRUM`, `RPC_POLYGON`, `RPC_OPTIMISM`, `RPC_AVALANCHE` | Alchemy, QuickNode or Ankr (HTTPS URLs) | On-chain name, symbol, decimals and supply during detection. The pattern is `RPC_` plus the network id in capitals |
| `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL` | You | Legal pages. Without the email the pages say "our support team" |

### Optional

| Name | Used for |
| --- | --- |
| `GECKOTERMINAL_API_KEY` | Only if you hold a separate GeckoTerminal or CoinGecko onchain key |

Not needed: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (no browser client talks to Supabase today) and `NEXT_PUBLIC_REOWN_PROJECT_ID`. `SUPABASE_DB_URL` is only for running migrations, keep it out of Vercel.

## 2. Accounts and APIs, in the order to set them up

1. **Privy** (free to start). Enable Email, Wallet and Google. Add your domain and `http://localhost:3000` to allowed origins. Embedded wallets are switched off in code on purpose.
2. **Supabase** project. Put the direct Postgres connection string in `SUPABASE_DB_URL` on your machine (not in Vercel) and run `npm run db:migrate`. It creates the schema, RLS, seed catalog and the two storage buckets.
3. Nothing else to set up for storage: the buckets come from the migrations.
4. **NOWPayments**. Create the account, set payout wallets there (Crypto Gems never holds funds), create an API key and IPN secret, set the IPN callback to `https://<your-domain>/api/webhooks/nowpayments`. Then in the admin area read the live currency list and enable only the payment methods you have verified.
5. **CoinGecko**. A paid plan is the safe production choice. The free tier is rate limited and has commercial-use limits.
6. **CoinMarketCap** (the info endpoint needs a plan that includes it).
7. **Anthropic**, plus a spending limit in their console.
8. **RPC provider** (one key can serve many chains on Alchemy).
9. **Vercel Cron**. `vercel.json` schedules `/api/cron/maintenance` every 5 minutes. Vercel Hobby only allows daily cron, so use Pro or an external scheduler.

## 3. First run

1. Apply migrations. 2. Sign in once, copy your user ID from the account menu, insert it as `super_admin` (see `ADMIN.md`). 3. In `/admin/payment-methods` enable verified methods. 4. Make one sandbox listing payment end to end and watch the IPN arrive. 5. Approve it in `/admin/listings`, confirm it appears in Boost. 6. Make a sandbox boost and a sandbox ad booking. 7. Run the maintenance job once and check expiry.

## 4. Decisions only the owner can make

- Legal pages: company name, contact email, governing law, refund and cancellation terms (`LEGAL_NOTES.md`). A lawyer must review them.
- Listing package prices and what each tier includes (defaults are $300, $700, $1,000).
- Which payment currencies to switch on.
- Whether Boost placements should be sold as rank ranges (the reference does) or kept as unranked sponsored slots (current, safer for trust).
- Refund policy for paid campaigns that are rejected at creative review.
- Whether to keep a light theme as an option. Dark neon is the default and only identity today; a light variant exists behind the toggle.

## 5. Accounts, the database, and Privy

Privy handles sign-in (email code, wallet, Google) and wallet linking. It does not store application data. Listings, orders, payments, campaigns, boosts, watchlists, alerts and notifications need a database, and Supabase is used only for that: users never sign up there, and there is no Supabase Auth. The first time a Privy user reaches the server a `profiles` row is created from their verified Privy id (`/api/account/sync`).

## 6. Data provider keys added for token detection

| Name | Needed | Where to get it |
| --- | --- | --- |
| none | DexScreener and GoPlus | Both are public and need no key. DexScreener supplies detection fallbacks and the banner strip. GoPlus supplies the token security check |
| `DEXTOOLS_API_KEY`, `DEXTOOLS_PLAN` | Optional | developer.dextools.io. Plan is `trial`, `standard`, `advanced` or `pro`. DexTools is a paid API |
| `BIRDEYE_API_KEY` | Optional, Solana | bds.birdeye.so, create an API key. Free tier has limits |
| `HELIUS_API_KEY` or `RPC_SOLANA` | Recommended, Solana | helius.dev, create a project and copy the key. Reads on-chain name, symbol, decimals and supply for any Solana mint |

Detection order for every field is on-chain, GeckoTerminal, DexScreener, CoinGecko, CoinMarketCap, DexTools, Birdeye. Whatever no provider can supply is listed as missing for the owner to complete.
