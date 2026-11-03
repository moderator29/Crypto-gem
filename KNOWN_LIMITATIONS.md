# Known limitations and status

This file is the honest ledger. Anything not marked **Working** should not be presented as live.

## Working (verified against live providers or tests)

- Market data layer: GeckoTerminal adapter with cache, request de-duplication, stale-if-error, retry with backoff, circuit breaker.
- Homepage aggregate: trending (organic score), heating up, new pairs, gainers, losers, volume. One server call, two provider requests.
- Organic ranking with published weights. Paid placements do not feed it.
- Token page: header, real OHLCV chart (Lightweight Charts), stats, pools, derived market risk signals, validated external trade links.
- Global search (name, symbol, address) with network shown for every result.
- Real-time token detection (`/api/detect`, streamed): chain resolution from one cross-network pool search, then parallel GeckoTerminal, CoinGecko, CoinMarketCap and on-chain reads. Per-field provenance. Missing fields reported, never invented.
- Checkout path (code complete, untested live): `/api/listings` creates submission, order and provider payment with a server-decided price; `/pay/[orderId]` shows address, QR, countdown and live status; `/api/webhooks/nowpayments` verifies signature, replay, order binding and amount before marking paid. Privy sign-in (email code, wallet, Google) at `/login`. Webhook behaviour is covered by 7 tests.
- Add Coin wizard UI: mode choice, live detection with real progress stages, multiple-chain picker, manual network fallback, provenance badges, form validation, package selection, order summary.
- NOWPayments primitives: status mapping, HMAC-SHA512 IPN verification (constant time), order matching, underpayment detection. Unit tested.
- Supabase schema with RLS, tested in-process against Postgres (PGlite): ownership, no self-publish, no self-verify, admin-only pricing, overlapping exclusive ad reservations rejected by the database, deduplicated ad events, idempotent webhook ledger.
- Light and dark themes, mobile-first layout, bottom navigation, drawer, search dialog. Verified at 390px with zero horizontal overflow.

## Configured but waiting on credentials

| Integration | Needs | Without it |
| --- | --- | --- |
| CoinMarketCap | `COINMARKETCAP_API_KEY` | Detection reports "not configured" for that provider |
| CoinGecko | optional `COINGECKO_API_KEY` | Public tier works but is rate limited |
| GeckoTerminal | optional pro key | Public tier is about 30 calls/min. Caching keeps normal use inside it, heavy traffic needs a paid plan |
| EVM RPC | `RPC_<NETWORK>` per chain | On-chain metadata stage is skipped and labelled |
| Privy | `NEXT_PUBLIC_PRIVY_APP_ID` | No sign-in, so no listing, boost, booking, dashboard or admin |
| Database (Supabase as Postgres) | URL and secret key | No listings, orders, campaigns |
| NOWPayments | API key, IPN secret | `/api/listings` answers 503 with the missing variable names |
| Reown | project id | No wallet connect |
| Anthropic | API key | No AI Copilot |

## Built since the first milestone (code complete, tested with fakes and PGlite, not run against live Supabase, NOWPayments or Anthropic)

- Boost: listed-project picker with search, chain filter and pagination from Supabase, pack selection with sponsored allocations, sponsored preview (mobile and desktop), checkout through the shared payment flow, activation only after a verified `finished` payment with server-side windows (a repeat purchase queues behind a running boost), maintenance job for expiry, a labelled Sponsored strip on the homepage. Overlap is prevented by a database constraint.
- Advertising: placement wireframe previews with the creative shown in place, booking wizard (placement, length, start date, creative upload, destination, review, pay), creative validation from file bytes (type, size, shape), availability and slot allocation (exclusive slots never double-sold), delivery with fair rotation and mobile creatives, impression tracking (visible for a second, one per visitor per hour, bots excluded) and click tracking with redirect.
- AI Copilot: streaming chat with five read-only data tools, strict facts versus interpretation prompt, token-page context, per-minute and per-day limits. It cannot trade or move funds.
- Admin (built by a second engineer, merged from `feat/admin`): role-guarded routes and UI for listing moderation, prices, payment methods, payments, creatives and an append-only audit log. See `ADMIN.md`.
- Reference-driven UI: expandable market rows, Top Trending carousel, shortcut pills, full-screen mobile search, drawer theme pill, footer.

- Sign-in with Privy (email code, wallet, Google). The server verifies Privy access tokens itself, with tests for wrong audience, wrong issuer, expiry, foreign keys, non-DID subjects and alg=none. Supabase is only the database.
- Add Coin parity with the reference: Chinese Telegram, BTOK and Weibo links, logo upload with preview and remove (real-byte image checks, own-folder storage rule), step labels, Change button on the detection card.
- Community voting on listed projects: one vote per project per day, 30 minutes between votes, the rule shown next to the button.
- Privacy, Terms and About pages written for this product. They contain marked placeholders (company name, contact email, jurisdiction, refund terms) listed in `LEGAL_NOTES.md`. Counsel must review them before launch.
- Desktop and tablet layouts: hero with side stack, sticky sortable market table (columns adapt at tablet width), right rail, denser Top Trending cards. Checked at 360, 390, 768, 1024 and 1280px with no horizontal overflow on 14 routes.

- Design elevation: one design system (`DESIGN_SYSTEM.md`), Live Rail, search-first homepage, real Markets (six views, server-side sort and pagination), Chains and chain pages, Search with recent searches, Settings with Privy account linking, dashboard as six routed pages, animated navigation, skip link, focus management in the search dialog and drawer, toasts. Zero axe violations and no horizontal overflow on 21 routes at 360, 390, 768, 1024 and 1280px.
- Supabase is the database and storage again; Privy handles sign-up, verification and wallets. RLS keyed to the Privy user id (JWT sub) is in `supabase/migrations/20261103000040_rls_privy.sql` and tested against Postgres.

## Not built yet

- Price alerts (the table exists; no alerting job or page). The dashboard says so instead of pretending.
- Saved filters for Markets (recent searches are kept in the browser only).
- Wallet connection beyond sign-in: Privy provides it; there is no separate swap or send flow, by design (non-custodial, trades happen on external venues).
- A browser Supabase client is not used: all data access is through server routes. The RLS policies exist for defence in depth and for a future minted-token client.

- User dashboard (watchlists, alerts, portfolio, saved searches UI) and the project-owner dashboard.
- Reconciliation cron for webhooks that never arrive, and refund handling.
- Crop and reposition tool in the creative studio (images are validated, not cropped). No role-management UI (roles are granted with SQL).
- Conversation history persistence and per-user AI quotas (limits are per IP, in memory).
- Community Favourites section on the homepage (votes are recorded and shown on token pages), token comparison page, Smart Money, sector heatmaps.
- Internationalisation covers the app chrome (navigation, footer, shortcuts, discovery labels) in 14 languages with English fallback and RTL for Arabic. Page bodies (wizards, Boost, Promotion, dashboard, admin, Copilot answers) are still English. The translations were machine-drafted and need native review before launch.
- Holders, transactions and community tabs on the token page.
- Playwright end-to-end tests, accessibility audit, Lighthouse run.
- Privy wallet sign-in does not replace a payment wallet: payments are crypto deposits through NOWPayments. The earlier Reown wallet-connect idea is not built and is not needed for sign-in.
- Privy was configured but not exercised against a real Privy app (no app id here). Verification is tested with locally signed tokens.
- Creative approval in admin does not itself schedule a campaign. The maintenance job promotes a paid campaign to scheduled or active once its desktop creative is approved, so the cron must be running (POST `/api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET`, every few minutes).
- Apply every migration in `supabase/migrations` in order, including `20261103000020_logos_bucket.sql` and `20261103000030_votes.sql`. `20261103000004_storage.sql` creates the public `creatives` bucket and is not covered by the PGlite tests.

## Provider constraints to plan for

- GeckoTerminal public API terms require attribution and limit commercial use on free tiers. A paid CoinGecko plan is the safe production choice.
- GeckoTerminal returns DEX pool data. A "market cap" there is the pool's own estimate and is labelled as such. CoinGecko and CoinMarketCap values take priority when present.
- TradingView Advanced Charts needs a separate licence. This build uses Lightweight Charts (free, attribution shown).
- Robinhood Chain is indexed by GeckoTerminal (slug `robinhood`). Chain id 4663 and the explorer host were taken from the brief and should be re-checked against official docs before enabling payments on it.
- No visual references have been received yet. See `VISUAL_REFERENCE_ANALYSIS.md`.

## Process note

The brief asks for every phase in one pass. This milestone delivers the foundation, market data, detection, token page, Add Coin flow and database. The remaining items above are the next milestones, in the order listed in `IMPLEMENTATION_PLAN.md`.
