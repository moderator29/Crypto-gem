# SteinzLabs Reuse Audit

Scope: `moderator29/steinzlabs` (Next.js 16, React 18, Tailwind 3, a hosted Postgres client, Reown, Anthropic), read at commit `ad6a68d`. This was a structural read of configuration, design tokens, and the modules named below. It was not a line-by-line review of the whole codebase, which has several thousand files.

No secrets, `.env` files or production credentials were read or copied.

## What was found

| Area | Location | Notes |
| --- | --- | --- |
| Design tokens and brand layer | `app/globals-brand.css`, `lib/brand/tokens.ts`, `tailwind.config.ts` | `nl-` prefixed tokens: canvas `#050816`, blue `#0066FF`, ice `#00C8FF`, crimson accents, radii, easing, glow shadows |
| Aurora background | `components/brand/AuroraBackground.tsx`, `.nl-aurora-bg` | Radial hotspots plus a rotating conic ribbon. Pure CSS, respects reduced motion |
| Glass surfaces | `components/ui/GlassCard.tsx`, `.nl-glass` | Dark glass with an edge-lit ring |
| UI primitives | `components/ui/*` | Button, CommandPalette, SelectMenu, Skeleton, Sparkline, Toggle, NotificationCenter, LanguageSwitcher |
| AI agent loop | `lib/ai/vtxAgent.ts`, `lib/ai/vtxToolExecutor.ts`, `lib/services/anthropic` | Tool-calling loop with an iteration cap, defensive tool execution, streaming variant |
| Payments | `lib/payments/config.ts`, `app/api/payments/*` | On-chain USDC treasury verification (not NOWPayments), unique-amount matching, cron verification |
| Token resolution | `lib/market/tokenChainResolver.ts`, `app/api/ca-lookup`, `app/api/coin-discovery` | Slug-to-chain routing and a contract lookup route |
| Security | `lib/security/*` (GoPlus, honeypot triangulation, LP lock, deployer history) | Large body of contract risk logic |
| Chains | `lib/chains/chainMeta.ts`, `evmRpc.ts`, `robinhoodData.ts` | Includes Robinhood Chain handling |
| i18n | `i18n.ts`, `messages/*.json` (ar, en, es, fr, hi, ja, ko, pt, tr, zh), `lib/i18n/*` | next-intl |
| Rate limiting and cache | `lib/rateLimit/*`, `lib/cache/upstash-rate-limit.ts` | Upstash backed |
| Hosted Postgres client | its `migrations` folder and database client modules | Migrations exist but are dated and the owner's own rules say verify against the live DB |
| Tests | `tests/lib`, `tests/security`, Playwright config | Small unit suite |

## Reuse directly (ideas and small utilities, re-implemented here)

- The address normalisation rule: lowercase EVM only, never lowercase Solana. Implemented in `src/lib/market-data/identifiers`.
- The agent loop shape: bounded iterations, a tool that throws becomes an error result instead of killing the turn.
- The aurora technique: gradients only, no JS.

## Adapt

- Design tokens. Crypto Gems uses its own palette (obsidian, electric blue, aurora cyan, violet, warm amber) and Tailwind 4 `@theme` tokens. Same family of effects, different identity.
- Security signals (`lib/security`). Valuable for the Phase 6 contract risk panel, but these modules lean on many SteinzLabs internals. Port the specific checks (mint and freeze authority, honeypot simulation, LP lock) one at a time with tests.
- Reown AppKit wiring from `app/wallet-providers.tsx` for wallet connection.
- i18n structure (next-intl and message files) for Phase 11.

## Rewrite

- Payments. SteinzLabs verifies USDC transfers to a treasury address. Crypto Gems uses NOWPayments with HMAC-SHA512 IPN verification. Different trust model, so this is new code (`src/lib/payments/nowpayments.ts`).
- Market data. SteinzLabs scatters provider calls across routes. Crypto Gems routes everything through one adapter layer with caching, de-duplication, retry and a circuit breaker.

## Do not reuse

- The SteinzLabs logo, the "nl-" naming, crimson Vault and Cult styling, and any Naka-specific copy or product concepts.
- Whole modules that depend on SteinzLabs tables, user tiers, or the Telegram and sniper subsystems.
- Tailwind 3 config as is. Its 1.5px default border override would change every component.

## Missing infrastructure in Crypto Gems today

A Neon database (DATABASE_URL), a Vercel Blob store, NOWPayments account, provider API keys, Reown project id, an AI key. See `SETUP.md` and `KNOWN_LIMITATIONS.md`.

## Dependency and security notes

- SteinzLabs pins `lightweight-charts@5`, `framer-motion@11`, `zod@4`, `@tanstack/react-query@5`, and a Postgres SSR helper. Crypto Gems uses the same major versions where it uses them.
- SteinzLabs ships Sentry, PostHog and Stripe. None are imported here.
- SteinzLabs' own `CLAUDE.md` forbids AI attribution in commits and em-dashes in copy. This repository follows the same conventions.
