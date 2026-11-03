# Architecture

## Shape

One Next.js app. Server components and route handlers talk to providers. The browser never sees a provider key and never calls a provider directly.

```
Browser ──> Next route handlers / server components
                 │
                 ├─ market-data   (adapters → cache → http client → providers)
                 ├─ detect        (chain resolution + parallel enrichment, streamed)
                 ├─ payments      (NOWPayments client, IPN verification)
                 ├─ auth          (Privy access token verified against Privy's public keys)
                 └─ database      (Supabase as Postgres only; secret key server side only)
```

## Market data

- `providers/*` are thin adapters returning provider-shaped data normalised into the internal model in `types/`.
- `http.ts` gives every call a timeout, exponential backoff on 429 and 5xx, and a per-provider circuit breaker (5 failures opens it for 30 seconds). 4xx other than 429 are never retried.
- `cache/` gives TTL caching, in-flight de-duplication (ten concurrent identical requests become one), and stale-if-error so a provider outage degrades to older data, flagged as stale, instead of an error.
- `identifiers/` classifies addresses and normalises them. Lowercase applies to EVM only. Assets are keyed by `network:address`, never by symbol.
- `networks.ts` is the single network registry. Provider slugs map to canonical ids here and nowhere else.

### Source priority

| Field | Priority |
| --- | --- |
| Pools, liquidity, pair age, DEX, OHLCV | GeckoTerminal |
| Price | GeckoTerminal, then CoinGecko, then CoinMarketCap |
| Market cap | CoinGecko, CoinMarketCap, then the DEX estimate |
| Metadata and links | CoinGecko, then CoinMarketCap |
| Name, symbol, decimals, supply | On-chain RPC when configured, then providers |

Sources are never averaged. Every detected field records its source. Conflicts resolve by the table above.

### Organic ranking

`ranking/index.ts`. Weights are public: volume 25%, momentum 20%, liquidity 20%, activity 20%, buy/sell balance 10%, freshness 5%. Momentum is capped so a thin pool pumping thousands of percent cannot outrank a liquid active market (covered by a test). "Heating up" requires last-hour volume at least 2.5 times the pool's own 24h hourly average and at least $10k liquidity, and states the measured ratio as its reason. Sponsored and boosted placements are a separate list with a Sponsored label and never enter this function.

## Detection engine

`detect/engine.ts` is an async generator. It emits stage events as real calls start and finish, then one result.

1. Classify the address. Unknown format returns invalid. Bitcoin returns unsupported (not a token contract).
2. With no network chosen: one GeckoTerminal cross-network pool search. Group matches by network. Zero matches is not found, one proceeds, several asks the user to pick.
3. Enrich in parallel: GeckoTerminal token and pools, CoinGecko by contract, CoinMarketCap by address (if keyed), ERC-20 reads over RPC (if configured).
4. Merge by priority with provenance. Anything no provider returned goes in `missing`. A provider that failed or is unconfigured is listed in `providerNotes`.

The client hook debounces input, aborts stale requests, ignores late events and caches successful results.

## Payments

All products (listings, ad campaigns, boosts) share one `orders` and `payments` model. Fulfilment requires the provider status `finished` after signature verification, order matching (payment id, order id, currency, price) and an amount check. Webhooks are made idempotent by a unique fingerprint in `payment_events`. A browser redirect is never evidence of payment.

## Database

`supabase/migrations`. RLS on every table. User ids are Privy DIDs (text). Private tables have no client policy, so the browser cannot touch them: every read and write goes through a server route that verifies the Privy token and binds the query to that user id. Only public catalog data (active packages and placements, published listings, live campaigns) has read policies. Exclusive ad placements cannot overlap because a GiST exclusion constraint rejects it. Verified by `tests/rls.test.ts` running the real migration in PGlite.

## Design system

Tokens are CSS variables in `globals.css`, mapped into Tailwind through `@theme`. Dark and light are separate palettes. Component classes (`.glass`, `.btn`, `.chip`, `.input`) live in `@layer components` so Tailwind utilities can override them. Aurora is gradients only. Reduced motion disables the marquee and aurora drift.
