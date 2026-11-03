# Database schema

Source of truth: `db/migrations/*.sql`, applied in file order by `npm run db:migrate` to Neon Postgres. Tested in `tests/db-schema.test.ts` (the real migrations run in PGlite).

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

User ids are Privy DIDs stored as text. There is no auth schema.

The database has no roles beyond the single application role in `DATABASE_URL` and no row policies. The browser never connects to it. Access control is entirely in the server routes, which verify the Privy token, check staff roles from `user_roles` and bind each query to the verified user id.

- Personal and commercial tables: read and written only by server routes after Privy token verification.
- Catalog tables (packages, placements, boost packs, payment methods): public routes return active rows only, writes go through admin routes that check the role.
- `token_submissions`: public routes return only `published` rows. Owners and reviewers act through routes that enforce who may see or change what.
- `orders`, `payments`: owners read their own through `/api/me/overview` and `/api/payments/[id]`, which bind the query to the verified user.
- Campaigns and boosts: public routes return live ones. Owners read their own through server routes.

`campaign_creatives.storage_path` holds the full https URL of the image in Vercel Blob (the column name is kept from the first schema).

## Integrity enforced by the database

- One live submission per `(network_id, address)`.
- No overlapping exclusive reservations for the same placement and slot (GiST exclusion).
- Ad events unique per `(campaign, kind, dedupe_key)`.
- Webhook ledger unique per fingerprint.
- Campaign destinations must start with `https://`.

Not yet in the schema: referral tracking, coupons, a market observations history table. Add when those features are built.
