# Implementation plan

Status key: done, partial, todo.

| # | Milestone | Status |
| --- | --- | --- |
| 0 | Recon, SteinzLabs audit, docs | done (visual references pending, none received) |
| 1 | Foundation: Next 16, TS strict, Tailwind 4, themes, layout, tests | done |
| 2 | Design system: header, drawer, bottom nav, search, glass, chips, skeletons, empty and error states | partial (tables, dialogs, tooltips, toasts, command palette beyond search to come) |
| 3 | Discovery homepage: ticker, banner slots, tabs, chain filter | partial (no campaigns yet, so slots show availability; most watched, community favourites, upcoming, ecosystem sections need Supabase) |
| 4 | Market data layer | partial (GeckoTerminal full, CoinGecko and CMC adapters for detection and global; reconciliation table in place; provider health endpoint to add) |
| 5 | Token page and charts | partial (overview, chart, pools, risk, trade; holders, transactions, community, AI tabs todo) |
| 6 | Add Coin and detection | partial (detection and wizard done; persistence, payment page, moderation todo) |
| 7 | Supabase accounts | partial (schema and RLS done; auth UI, dashboard todo) |
| 8 | Promotion marketplace | partial (catalog and pricing display; booking, creative studio, delivery engine todo) |
| 9 | AI Copilot | todo |
| 10 | Admin | todo |
| 11 | i18n | todo |
| 12 | E2E, accessibility, performance, security hardening | partial (unit and RLS tests, mobile overflow check) |

## Next, in order

1. Supabase client wiring and auth, so listings and campaigns can persist.
2. Order creation, NOWPayments payment page, IPN route, reconciliation cron. Unlocks all three revenue engines.
3. Listing moderation (admin queue) and publication into discovery.
4. Ad delivery engine, click and impression routes, booking checkout, creative studio.
5. Boost checkout, activation and expiry job.
6. AI Copilot with token context.
7. Admin dashboard, i18n, Market Pulse.
