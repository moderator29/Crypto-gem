# NOWPayments setup

1. Create a merchant account at nowpayments.io. Use the sandbox (`NOWPAYMENTS_SANDBOX=true`) first.
2. Create an API key. Put it in `NOWPAYMENTS_API_KEY`.
3. Set an IPN secret in the dashboard and copy it to `NOWPAYMENTS_IPN_SECRET`.
4. Set the IPN callback URL to `https://<your-domain>/api/webhooks/nowpayments` (route to be added with order creation).
5. Set your payout wallets in the NOWPayments dashboard. Crypto Gems never holds funds or keys.
6. Enable the currencies you want. The checkout lists only currencies the provider reports as enabled (`GET /v1/merchant/coins`) and that an administrator has also enabled in `payment_methods`. Currency codes such as `usdtbsc` or `usdcbase` must be read from the live list, never assumed.

## Verification rules implemented

- Signature: HMAC-SHA512 of the JSON body with keys sorted recursively, compared in constant time to `x-nowpayments-sig`.
- Order binding: payment id, order id, pay currency and USD price must match the order we created.
- Fulfilment: only status `finished`, and `actually_paid` must be within 0.5 percent of the quoted amount. `partially_paid` never fulfils. Unknown statuses map to `created`, never to paid.
- Idempotency: each delivery is fingerprinted into `payment_events` with a unique constraint, so a replay is a no-op.

## Status mapping

created, waiting, confirming, confirmed, sending, partially_paid, finished, failed, expired, refunded.

## Still to build

Order creation route, the payment page (address, QR, countdown, status polling), the IPN route, and the reconciliation job. The primitives above are done and tested in `tests/payments.test.ts`.
