# Setup

## Local

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Discovery, token pages, charts, search and detection run with no keys.

## Sign-in (Privy)

Identity is handled by Privy, so there is no sign-up form and no password. Users sign in with an email code, a wallet or Google.

1. Create an app at dashboard.privy.io. Under Login methods enable Email, Wallet and Google.
2. Copy the App ID into `NEXT_PUBLIC_PRIVY_APP_ID`. Add your site URL (and `http://localhost:3000`) to the allowed origins.
3. Embedded wallets are switched off in code. Crypto Gems never creates or holds wallets.

The server verifies each request's Privy access token against the app's public keys. No Privy secret is needed for that. User ids are Privy DIDs (`did:privy:...`) stored as text.

## Database (Supabase) and storage

Privy handles sign-up, verification and wallets. Supabase is the database and file storage. Supabase Auth is not used.

1. Create a Supabase project. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL` and the secret key into `SUPABASE_SECRET_KEY` (server only, never prefix with `NEXT_PUBLIC_`).
2. Copy the direct Postgres connection string (Project Settings, Database) into `SUPABASE_DB_URL` locally and run `npm run db:migrate`. It applies `supabase/migrations/*.sql` in order, each in a transaction, records them in `schema_migrations`, and is safe to run again. The migrations create the tables, constraints, seed catalog, the `creatives` and `logos` storage buckets, and all Row Level Security.
3. Grant the first super admin, see `ADMIN.md`.

### How RLS works with Privy

User ids are Privy DIDs stored as text. Policies compare columns to `public.app_uid()`, which reads the `sub` claim of the request JWT. Private tables have owner policies, staff roles come from `user_roles`, orders and payments are readable by their owner and never writable from a client, and the audit log is append-only. Server routes use the secret key (which bypasses RLS) only after verifying the caller's Privy access token, and bind every query to that user id. If you later want browser clients to query Supabase directly, mint a short-lived Supabase JWT (role `authenticated`, `sub` equal to the DID) from a route that has verified the Privy token; the policies already restrict such a client to its own rows. The policies are tested against Postgres in `tests/rls.test.ts`.

## Market data

- CoinGecko: create a key at coingecko.com/api. Set `COINGECKO_API_KEY` and `COINGECKO_API_PLAN` (`demo` or `pro`). A pro key also switches GeckoTerminal calls to the pro onchain host.
- CoinMarketCap: key from pro.coinmarketcap.com in `COINMARKETCAP_API_KEY`.
- RPC: set `RPC_ETHEREUM`, `RPC_BSC`, `RPC_BASE` and so on to HTTPS endpoints (Alchemy, QuickNode, Ankr). The variable name is `RPC_` plus the network id uppercased, for example `RPC_ARBITRUM`.

## Payments

See `NOWPAYMENTS_SETUP.md`.

## Wallet connect and AI

`NEXT_PUBLIC_REOWN_PROJECT_ID` from cloud.reown.com. `ANTHROPIC_API_KEY` for the Copilot. Optional `AI_MODEL` (defaults to claude-sonnet-5-5).

## Scheduled job

Call `POST /api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET` every 5 minutes (Vercel Cron, GitHub Actions or any scheduler). It expires boosts and campaigns, schedules approved campaigns and expires stale orders. Safe to run twice.

## Tests and production

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm start
```

Deploy to any Node host. On Vercel, add the same variables to the project settings. The in-memory cache and rate limiter are per instance, which is fine for one instance and should move to a shared store when scaling out.
