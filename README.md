# Crypto Gems

Multi-chain token discovery, market intelligence, listings and a promotion marketplace. Next.js 16, React 19, Tailwind 4, Supabase, Lightweight Charts.

See `KNOWN_LIMITATIONS.md` for exactly what is working today and what is waiting on credentials or still to build.

## Run it

```bash
npm install
cp .env.example .env.local     # every key is optional for local browsing
npm run dev
```

Discovery, the token page, charts, search and token detection work with no keys, using the public GeckoTerminal and CoinGecko tiers (rate limited, cached).

## Checks

```bash
npm run typecheck
npm run lint
npm test          # unit tests plus Postgres RLS tests (in-process, no database needed)
npm run build
```

## Layout

```
src/lib/market-data   provider adapters, cache, http client, ranking, networks, identifiers
src/lib/detect        real-time contract and chain detection engine
src/lib/payments      NOWPayments client, IPN verification
src/lib/ads           placement catalog and delivery
src/app/api           detect (streamed), market/home, search, ohlcv, listings
supabase/migrations   schema and row level security
docs                  architecture and integration notes
```

## Principles

Real data or an honest empty state. Non-custodial: no keys, no custody, trades happen on external venues. Paid placements are always labelled and never alter organic rank. Mobile first.

Docs: `ARCHITECTURE.md`, `API_INTEGRATIONS.md`, `NOWPAYMENTS_SETUP.md`, `SETUP.md`, `SECURITY.md`, `DATABASE_SCHEMA.md`, `IMPLEMENTATION_PLAN.md`, `STEINZLABS_REUSE_AUDIT.md`.
