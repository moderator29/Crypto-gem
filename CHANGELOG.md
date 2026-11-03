# Changelog

## Unreleased

- Database is now Neon Postgres and file storage is Vercel Blob. Identity stays Privy. Schema lives in `db/migrations` and is applied with `npm run db:migrate`.

### Migrating from Supabase

The earlier builds used Supabase as the Postgres host and for storage. It is gone. Create a Neon database from the Vercel Marketplace (sets `DATABASE_URL`), connect a Vercel Blob store (sets `BLOB_READ_WRITE_TOKEN`), run `npm run db:migrate`, and remove the old Supabase variables. Row level security, role grants and storage buckets are not used any more: access control is in the server routes. Existing data and uploaded files are not moved automatically. Image files must be re-uploaded to Blob and the full Blob URL stored in `logo_url` and `campaign_creatives.storage_path`.

## 0.3.0

- Privy sign-in replaces Supabase Auth. Database user ids are Privy DIDs. Private tables are server-only.
- Desktop and tablet layouts, sortable market table, right rail.
- Add Coin parity (extra links, logo upload), Privacy, Terms and About pages, community votes.

## 0.2.0

- Boost flow, ad booking and delivery, AI Copilot, admin and moderation, reference-driven UI refresh.

## 0.1.0

- Foundation: Next.js 16, React 19, Tailwind 4, strict TypeScript, light and dark themes.
- Market data layer with cache, de-duplication, backoff and circuit breaker. GeckoTerminal, CoinGecko and CoinMarketCap adapters.
- Discovery homepage: ticker, trending (organic score), heating up, new pairs, gainers, losers, volume, chain filter.
- Token page with real candles, pools, derived risk signals and validated trade links.
- Real-time contract and chain detection, streamed, with per-field provenance.
- Add Coin wizard with Express and Standard paths.
- Promotion and Boost pages describing current price books. Checkout is not live.
- NOWPayments IPN verification primitives.
- Supabase schema with RLS and tests.
