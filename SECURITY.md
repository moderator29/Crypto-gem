# Security

## Implemented

- Provider keys are read from server-side environment variables only. The browser calls our routes, never providers.
- Our routes are rate limited per IP and validate every input (address format and length, network against the registry, pool id pattern, timeframe whitelist).
- External trade links are built from a fixed host per venue and a format-validated address.
- Logos are accepted only from `https://` URLs. All outbound links use `rel="noopener noreferrer"`, paid ones add `sponsored`.
- Provider text (names, descriptions) is rendered as text by React. No `dangerouslySetInnerHTML` is used with provider or user data (the only use is a static theme script).
- Security headers: nosniff, frame deny, referrer policy, permissions policy.
- Sign-in is Privy. Every protected route verifies the Privy access token (ES256 signature, issuer, audience, expiry) before doing anything, and tests cover wrong audience, wrong issuer, expiry, foreign keys, non-DID subjects and alg=none.
- RLS on every table, tested. Private tables have no client policy, so the browser cannot read or write orders, payments, campaigns, roles or notes. Server routes bind every query to the verified user id.
- Campaign destinations must be `https://` (database constraint).
- Payment webhook verification, constant-time compare, idempotency ledger.
- Non-custodial: the app holds no keys and executes no trades.

## Market risk signals are not an audit

The token page shows signals derived from pool data. It says so on the page. It does not claim a contract is safe, audited or liquidity locked. Real contract checks (honeypot simulation, mint and freeze authority, ownership, LP lock) are planned and will state their source and time.

## To do before launch

- CSP header with nonces. Shared-store rate limiting. Upload scanning for creatives. Admin routes with server-side role checks and audit logging. Dependency audit in CI. Secret scanning in CI.

## Reporting

Email the owner. Do not open public issues for vulnerabilities.
