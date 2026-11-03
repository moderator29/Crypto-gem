# Setup

## Local

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Discovery, token pages, charts, search and detection run with no keys.

## Supabase

1. Create a project. Copy the project URL and the publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Copy the secret key into `SUPABASE_SECRET_KEY`. Server only. Never prefix it with `NEXT_PUBLIC_`.
3. Apply `supabase/migrations/*.sql` (SQL editor, or `supabase db push` with the CLI linked to the project).
4. Grant the first super admin by inserting a row into `public.user_roles` from the SQL editor.

## Market data

- CoinGecko: create a key at coingecko.com/api. Set `COINGECKO_API_KEY` and `COINGECKO_API_PLAN` (`demo` or `pro`). A pro key also switches GeckoTerminal calls to the pro onchain host.
- CoinMarketCap: key from pro.coinmarketcap.com in `COINMARKETCAP_API_KEY`.
- RPC: set `RPC_ETHEREUM`, `RPC_BSC`, `RPC_BASE` and so on to HTTPS endpoints (Alchemy, QuickNode, Ankr). The variable name is `RPC_` plus the network id uppercased, for example `RPC_ARBITRUM`.

## Payments

See `NOWPAYMENTS_SETUP.md`.

## Wallet connect and AI

`NEXT_PUBLIC_REOWN_PROJECT_ID` from cloud.reown.com. `ANTHROPIC_API_KEY` for the Copilot once it is built.

## Tests and production

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm start
```

Deploy to any Node host. On Vercel, add the same variables to the project settings. The in-memory cache and rate limiter are per instance, which is fine for one instance and should move to a shared store when scaling out.
