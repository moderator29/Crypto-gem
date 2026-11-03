# Known limitations and status

This file is the honest ledger. Anything not marked **Working** should not be presented as live.

## Working (verified against live providers or tests)

- Market data layer: GeckoTerminal adapter with cache, request de-duplication, stale-if-error, retry with backoff, circuit breaker.
- Homepage aggregate: trending (organic score), heating up, new pairs, gainers, losers, volume. One server call, two provider requests.
- Organic ranking with published weights. Paid placements do not feed it.
- Token page: header, real OHLCV chart (Lightweight Charts), stats, pools, derived market risk signals, validated external trade links.
- Global search (name, symbol, address) with network shown for every result.
- Real-time token detection (`/api/detect`, streamed): chain resolution from one cross-network pool search, then parallel GeckoTerminal, CoinGecko, CoinMarketCap and on-chain reads. Per-field provenance. Missing fields reported, never invented.
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

## Not built yet

- Supabase Auth flows and user dashboard (watchlists, alerts, portfolio, saved searches UI).
- Order creation and the NOWPayments payment page (QR, countdown), IPN route, reconciliation job.
- Advertising: booking checkout, creative upload and crop studio, placement preview, delivery and rotation engine, impression and click routes (`/api/ads/click` is referenced by `CampaignSlot` but does not exist yet, and `CampaignSlot` is unreachable until campaigns exist), analytics dashboard.
- Boost checkout and activation, sponsored placement engine, expiry cron.
- AI Copilot.
- Admin dashboard, moderation queue, audit log UI.
- Market Pulse heatmaps, token comparison, Smart Money.
- Internationalisation (strings are currently inline English).
- Holders tab, transactions tab, community tab on the token page.
- Playwright end-to-end tests, accessibility audit, Lighthouse run.

## Provider constraints to plan for

- GeckoTerminal public API terms require attribution and limit commercial use on free tiers. A paid CoinGecko plan is the safe production choice.
- GeckoTerminal returns DEX pool data. A "market cap" there is the pool's own estimate and is labelled as such. CoinGecko and CoinMarketCap values take priority when present.
- TradingView Advanced Charts needs a separate licence. This build uses Lightweight Charts (free, attribution shown).
- Robinhood Chain is indexed by GeckoTerminal (slug `robinhood`). Chain id 4663 and the explorer host were taken from the brief and should be re-checked against official docs before enabling payments on it.
- No visual references have been received yet. See `VISUAL_REFERENCE_ANALYSIS.md`.

## Process note

The brief asks for every phase in one pass. This milestone delivers the foundation, market data, detection, token page, Add Coin flow and database. The remaining items above are the next milestones, in the order listed in `IMPLEMENTATION_PLAN.md`.
