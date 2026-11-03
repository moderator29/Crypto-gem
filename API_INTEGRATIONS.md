# API integrations

Endpoints below are the ones the code calls today. Check each provider's current terms and plan limits before production.

| Provider | Endpoint | Purpose | Auth | Cache TTL | Notes |
| --- | --- | --- | --- | --- | --- |
| GeckoTerminal | `GET /networks/trending_pools`, `/networks/{n}/trending_pools` | Trending pools | none (public) or CoinGecko pro key | 60s | Public tier roughly 30 calls/min |
| GeckoTerminal | `/networks/new_pools`, `/networks/{n}/new_pools` | New pairs | same | 60s | |
| GeckoTerminal | `/networks/{n}/pools` | Top pools | same | 120s | |
| GeckoTerminal | `/search/pools?query=` | Name, symbol and cross-network address search | same | 45s | Used for chain detection in one call |
| GeckoTerminal | `/networks/{n}/tokens/{addr}` and `/pools` | Token info and its pools | same | 45 to 60s | |
| GeckoTerminal | `/networks/{n}/pools/{pool}/ohlcv/{minute\|hour\|day}` | Candles | same | 30s | `aggregate` 1, 5, 15 minutes, 1, 4 hours, 1 day |
| GeckoTerminal | `/networks` | Supported network discovery | same | 6h | Implemented in the adapter, not yet surfaced in UI |
| CoinGecko | `/coins/{platform}/contract/{address}` | Metadata, links, market data | optional `x-cg-demo-api-key` or `x-cg-pro-api-key` | 5 min | 404 means not listed, returned as no match |
| CoinGecko | `/global` | Global market stats | same | 5 min | Adapter only, not yet shown |
| CoinMarketCap | `/v2/cryptocurrency/info?address=` and `/v2/cryptocurrency/quotes/latest?id=` | Metadata, quote, rank | `X-CMC_PRO_API_KEY` | 10 min and 60s | Needs a plan that includes the info endpoint. Not configured means detection says so |
| NOWPayments | `POST /v1/payment`, `GET /v1/payment/{id}`, `GET /v1/merchant/coins`, `GET /v1/min-amount` | Payments | `x-api-key` | none | Sandbox host `api-sandbox.nowpayments.io` |
| JSON-RPC | `eth_call` for `name()`, `symbol()`, `decimals()`, `totalSupply()` | On-chain ERC-20 metadata | RPC URL in env | none | Only when `RPC_<NETWORK>` is set |

Rate limits are handled by caching, de-duplication, backoff on 429, stale-if-error, and per-IP limits on our own routes (`/api/detect` 20/min, `/api/search` 40/min, `/api/ohlcv` 60/min). The per-IP limiter is in-memory and per instance. Move it to a shared store before running several instances.

Attribution: show "GeckoTerminal" and "CoinGecko" as data sources (done in the UI) and keep the Lightweight Charts notice.
