# Known limitations and status

This file is the honest ledger. Anything not marked **Working** should not be presented as live.

## Working (verified against live providers or tests)

- Market data layer: GeckoTerminal adapter with cache, request de-duplication, stale-if-error, retry with backoff, circuit breaker.
- Homepage aggregate: trending (organic score), heating up, new pairs, gainers, losers, volume. One server call, two provider requests.
- Organic ranking with published weights. Paid placements do not feed it.
- Token page: header, real OHLCV chart (Lightweight Charts), stats, pools, derived market risk signals, validated external trade links.
- Global search (name, symbol, address) with network shown for every result.
- Real-time token detection (`/api/detect`, streamed): chain resolution from one cross-network pool search, then parallel GeckoTerminal, CoinGecko, CoinMarketCap and on-chain reads. Per-field provenance. Missing fields reported, never invented.
- Checkout path (code complete, untested live): `/api/listings` creates submission, order and provider payment with a server-decided price; `/pay/[orderId]` shows address, QR, countdown and live status; `/api/webhooks/nowpayments` verifies signature, replay, order binding and amount before marking paid. Magic-link sign-in at `/login`. Webhook behaviour is covered by 7 tests.
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
| Supabase | URL, publishable key, secret key | No accounts, listings, campaigns |
| NOWPayments | API key, IPN secret | `/api/listings` answers 503 with the missing variable names |
| Reown | project id | No wallet connect |
| Anthropic | API key | No AI Copilot |

## Built since the first milestone (code complete, tested with fakes and PGlite, not run against live Supabase, NOWPayments or Anthropic)

- Boost: listed-project picker with search, chain filter and pagination from Supabase, pack selection with sponsored allocations, sponsored preview (mobile and desktop), checkout through the shared payment flow, activation only after a verified `finished` payment with server-side windows (a repeat purchase queues behind a running boost), maintenance job for expiry, a labelled Sponsored strip on the homepage. Overlap is prevented by a database constraint.
- Advertising: placement wireframe previews with the creative shown in place, booking wizard (placement, length, start date, creative upload, destination, review, pay), creative validation from file bytes (type, size, shape), availability and slot allocation (exclusive slots never double-sold), delivery with fair rotation and mobile creatives, impression tracking (visible for a second, one per visitor per hour, bots excluded) and click tracking with redirect.
- AI Copilot: streaming chat with five read-only data tools, strict facts versus interpretation prompt, token-page context, per-minute and per-day limits. It cannot trade or move funds.
- Admin (built by a second engineer, merged from `feat/admin`): role-guarded routes and UI for listing moderation, prices, payment methods, payments, creatives and an append-only audit log. See `ADMIN.md`.
- Reference-driven UI: expandable market rows, Top Trending carousel, shortcut pills, full-screen mobile search, drawer theme pill, footer.

## Not built yet

- User dashboard (watchlists, alerts, portfolio, saved searches UI) and the project-owner dashboard.
- Reconciliation cron for webhooks that never arrive, and refund handling.
- Crop and reposition tool in the creative studio (images are validated, not cropped). No role-management UI (roles are granted with SQL).
- Conversation history persistence and per-user AI quotas (limits are per IP, in memory).
- Community voting, Market Pulse heatmaps, token comparison page, Smart Money.
- Internationalisation (strings are inline English).
- Holders, transactions and community tabs on the token page.
- Playwright end-to-end tests, accessibility audit, Lighthouse run.
- Creative approval in admin does not itself schedule a campaign. The maintenance job promotes a paid campaign to scheduled or active once its desktop creative is approved, so the cron must be running (POST `/api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET`, every few minutes).
- Apply every migration in `supabase/migrations` in order. `20261103000004_storage.sql` creates the public `creatives` bucket and is not covered by the PGlite tests.

## Provider constraints to plan for

- GeckoTerminal public API terms require attribution and limit commercial use on free tiers. A paid CoinGecko plan is the safe production choice.
- GeckoTerminal returns DEX pool data. A "market cap" there is the pool's own estimate and is labelled as such. CoinGecko and CoinMarketCap values take priority when present.
- TradingView Advanced Charts needs a separate licence. This build uses Lightweight Charts (free, attribution shown).
- Robinhood Chain is indexed by GeckoTerminal (slug `robinhood`). Chain id 4663 and the explorer host were taken from the brief and should be re-checked against official docs before enabling payments on it.
- No visual references have been received yet. See `VISUAL_REFERENCE_ANALYSIS.md`.

## Process note

The brief asks for every phase in one pass. This milestone delivers the foundation, market data, detection, token page, Add Coin flow and database. The remaining items above are the next milestones, in the order listed in `IMPLEMENTATION_PLAN.md`.
