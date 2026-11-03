# Database schema

Source of truth: `supabase/migrations/20261103000001_core_schema.sql`. Tested in `tests/rls.test.ts`.

| Group | Tables |
| --- | --- |
| Identity | `profiles`, `user_roles` (roles: user, project_owner, listing_reviewer, advertising_manager, support_agent, admin, super_admin) |
| Personal | `watchlists`, `watchlist_items`, `saved_searches`, `price_alerts`, `notifications`, `ai_conversations`, `ai_messages`, `community_votes` |
| Listings | `listing_packages`, `token_submissions` |
| Payments | `orders`, `payments`, `payment_events`, `payment_methods` |
| Advertising | `advertising_placements`, `advertising_campaigns`, `campaign_creatives`, `exclusive_reservations`, `ad_events` |
| Boost | `boost_packs`, `boost_campaigns` |
| Admin | `platform_settings`, `admin_audit_logs` |

## Access model

User ids are Privy DIDs stored as text. There is no `auth.users` dependency.

- Personal and commercial tables: no client policy, server only (secret key) after Privy token verification.
- Catalog tables (packages, placements, boost packs, payment methods): public read of active rows, writes go through admin routes that check the role.
- `token_submissions`: public clients see only `published` rows. Owners and reviewers act through server routes that enforce who may see or change what.
- `orders`, `payments`: server only. Owners read their own through `/api/me/overview` and `/api/payments/[id]`, which bind the query to the verified user.
- Campaigns and boosts: public clients see live ones. Owners read their own through server routes.
- `exclusive_reservations`: no policies. Server only.

## Integrity enforced by the database

- One live submission per `(network_id, address)`.
- No overlapping exclusive reservations for the same placement and slot (GiST exclusion).
- Ad events unique per `(campaign, kind, dedupe_key)`.
- Webhook ledger unique per fingerprint.
- Campaign destinations must start with `https://`.

Not yet in the schema: referral tracking, coupons, a market observations history table. Add when those features are built.
