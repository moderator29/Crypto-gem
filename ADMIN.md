# Admin area

Staff tools for listing review, pricing, payment methods, payments, creatives and the audit trail. Everything is enforced on the server. The pages under `/admin` are a convenience: hiding a tab does nothing for security, every API route re-checks the caller's roles in the database on every request.

## Roles

Roles live in `public.user_roles` (enum `app_role`). The admin API reads them through the secret-key client, never from the browser.

| Role | Can do |
| --- | --- |
| `listing_reviewer` | Read the listing queue and detail, approve, reject, request changes, publish, suspend, add notes. Overview. |
| `advertising_manager` | Review creatives. Edit advertising placement prices. Overview. |
| `support_agent` | Read listings and payments. No changes. Overview. |
| `admin` | Everything the roles above can do, plus listing package and boost pack prices, payment method switches and the audit log. |
| `super_admin` | Passes every check. |

The exact sets are in `src/lib/admin/roles.ts` (`ACCESS`). `requireRole(req, roles)` in `src/lib/admin/auth.ts` returns `401` (no valid session), `403` (signed in, wrong role) or `503` (database not configured on the server).

Decision: `admin` is allowed on every route, including placement prices and creatives, even though the intended owner of placements is `advertising_manager`. The database has no row policies, so the role table above is the only place access is decided.

## Grant the first super admin

Identity is Privy. Sign in at `/login`, open the account menu in the header and choose **Copy user ID** (it looks like `did:privy:abc123`). Then run this in the database SQL editor, which runs as a privileged role:

```sql
insert into public.user_roles (user_id, role)
values ('did:privy:PASTE_YOUR_ID_HERE', 'super_admin')
on conflict do nothing;
```

Other roles are granted the same way. There is no UI for role management yet, on purpose: granting power should be a deliberate database action.

## Routes

All routes live in `src/app/api/admin/`, expect `Authorization: Bearer <access token>`, validate bodies with Zod, and are rate limited (240 per minute per IP, then 120 reads or 30 writes per minute per staff user).

| Route | Method | Roles | Purpose |
| --- | --- | --- | --- |
| `/me` | GET | any signed-in user | Returns the caller's staff roles for the UI shell. |
| `/overview` | GET | listing_reviewer, advertising_manager, support_agent, admin | Pending submissions, published listings, pending payments, paid orders, gross paid revenue (USD), active campaigns. |
| `/listings` | GET | reviewer, support, admin | Queue filtered by `?status=a,b` (default `submitted,pending_review`, `all` for none). `?id=` returns one submission with notes and orders. |
| `/listings` | POST | reviewer, admin | `{ id, action, reason? }`. Actions: `approve`, `reject`, `request_changes`, `publish`, `suspend`, `note`. |
| `/prices` | GET | advertising_manager, admin | Every row of `listing_packages`, `boost_packs`, `advertising_placements`. |
| `/prices` | PUT | admin (placements: advertising_manager, admin) | `{ table, id, patch }`. Numbers validated, before and after rows audited. |
| `/payment-methods` | GET | admin | Methods with whether NOWPayments currently lists each currency. |
| `/payment-methods` | PUT | admin | `{ id, enabled }`. Enabling is refused unless `nowpayments.currencies()` lists the currency right now. Disabling is always allowed. |
| `/payments` | GET | support_agent, admin | Read only. Filters: `status`, `kind`, `q` (exact order id or provider payment id), `from`, `to`, `limit`, `offset`. |
| `/creatives` | GET | advertising_manager, admin | Pending creatives with their campaign. |
| `/creatives` | POST | advertising_manager, admin | `{ id, decision: approve or reject, note }`. A note is required to reject. |
| `/audit` | GET | admin | Recent entries, newest first. Exact filters on `action` and `actor`. |

### Listing state machine

Defined once in `src/lib/admin/transitions.ts` and used by both the API and the UI buttons.

| Action | From | To | Reason |
| --- | --- | --- | --- |
| `approve` | submitted, pending_review | approved | optional |
| `reject` | submitted, pending_review, approved | rejected | required |
| `request_changes` | submitted, pending_review | draft | required |
| `publish` | approved, suspended | published | optional |
| `suspend` | published | suspended | required |
| `note` | any | unchanged | required |

Everything else is refused with `409`. Staff cannot move `awaiting_payment`, `payment_confirmed` or terminal states. `publish` also requires a paid listing order (`orders.kind = 'listing'`, `status = 'paid'`), so a listing can never go live unpaid. Reinstating a suspended listing is `publish`. The update is guarded on the status that was read, so two reviewers acting at once cannot both win (`409`, reload and retry).

## Audit

`writeAudit(actor, action, target, before, after)` in `src/lib/admin/audit.ts` appends to `admin_audit_logs`. Every mutating route calls it after the change succeeds, and a test asserts one entry per mutation and none for refused or invalid requests. If the audit insert itself fails the route answers `500` with `applied: true` so the operator knows the change landed and must be checked. The migration adds a trigger that makes `admin_audit_logs` append-only: updates and deletes raise, even for the application role.

Reviewer reasons are also stored in `moderation_notes` (only the server touches it, after a role check).

## Migration

`db/migrations/20261103000010_admin_moderation.sql` adds `moderation_notes`, read-path indexes and the append-only trigger. Apply it (`npm run db:migrate`) before using listing detail (`/api/admin/listings?id=`) and review actions that carry a reason. It is covered by `tests/db-schema.test.ts` (PGlite).

## UI

`/admin` (overview), `/admin/listings` and `/admin/listings/[id]` (submitted versus detected comparison, action buttons with confirmation and reason), `/admin/prices`, `/admin/payment-methods`, `/admin/payments`, `/admin/creatives`, `/admin/audit`. Sign-in uses Privy: `accessToken()` returns a fresh Privy access token that is sent as a Bearer header and verified on the server. Anyone without a staff role sees a no-access state. Tables collapse to stacked cards on phones. When sign-in or the database is not configured the shell says so instead of showing empty numbers.

## Decisions

- Revenue is the sum of `orders.price_usd` where `status = 'paid'`, read in pages of 1,000 up to 20,000 orders. Past that the overview flags the figure as partial.
- "Pending payments" counts `payments` in an in-flight status (created, waiting, confirming, confirmed, sending, partially_paid).
- `request_changes` returns the listing to `draft`, the only state where the owner can edit, and copies the reason to `rejection_reason`.
- Placement price editing changes the amount for existing durations only. Adding or removing durations is not offered.
- Filters on payments and audit are exact matches, so no user text is ever interpolated into a query.

## Not covered

- Role management UI. Grant and revoke roles with SQL.
- The submitted versus detected view depends on `token_submissions.detected`. `POST /api/listings` does not store the detection snapshot today, so most rows show "No detection snapshot". The comparison works as soon as that column is populated.
- Creative upload does not exist yet, so the creatives queue is empty until it does. Approving a creative does not change its campaign status, and there is no campaign management screen.
- Refunds, payment reconciliation and any action on payments. The payments page is read only.
- Boost campaign and advertising campaign moderation, user management, platform settings and coupons.
- Rate limiting is in memory per server instance (see `src/lib/utils/rateLimit.ts`). Use a shared store before running several instances.
- The audit insert is a second statement after the change, not part of one transaction. Wrap both in a database function if that gap matters.
- Not exercised against a live Neon database or a live NOWPayments account. Routes are covered with an in-memory database fake and the SQL with PGlite.
- Layout was checked at 390px only for the unconfigured state. Data-backed screens are built as stacked cards on phones but were not browser-checked with live data.
