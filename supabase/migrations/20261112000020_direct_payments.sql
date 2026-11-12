-- Direct crypto payments: buyer sends from their own wallet, the server verifies the transfer on chain.
-- Reuses public.payments with provider = 'direct'. Additive and idempotent.

alter table public.payments add column if not exists receipt_no text;
alter table public.payments add column if not exists message text;
alter table public.payments add column if not exists confirmations integer not null default 0;
alter table public.payments add column if not exists rate_usd numeric;
alter table public.payments add column if not exists last_checked_at timestamptz;

-- A transaction hash can back only one direct payment.
create unique index if not exists payments_direct_tx_hash_uidx on public.payments (lower(tx_hash)) where provider = 'direct' and tx_hash is not null;
-- One live intent per order and method.
create unique index if not exists payments_direct_live_uidx on public.payments (order_id, pay_currency) where provider = 'direct' and status in ('created', 'waiting', 'confirming', 'partially_paid');
-- No two live intents on the same asset and network share an amount (the amount carries a per-payment fingerprint).
create unique index if not exists payments_direct_amount_live_uidx on public.payments (pay_currency, pay_amount) where provider = 'direct' and status in ('created', 'waiting', 'confirming', 'partially_paid');

-- Verified transfers. Several hashes may add up to one payment; a hash is unique across all payments.
create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  tx_hash text not null unique,
  amount numeric not null,
  amount_units text not null,
  verified_at timestamptz not null default now()
);
create index if not exists payment_proofs_payment_idx on public.payment_proofs (payment_id);

-- Server only: no client policies, so RLS denies every client read and write.
alter table public.payment_proofs enable row level security;
