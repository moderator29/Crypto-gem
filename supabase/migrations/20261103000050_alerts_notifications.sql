-- Price alerts carry the token label so lists render without a provider call; notifications can link somewhere.
alter table public.price_alerts add column if not exists symbol text;
alter table public.price_alerts add column if not exists name text;
alter table public.price_alerts add column if not exists triggered_price numeric;
alter table public.notifications add column if not exists href text;
create index if not exists price_alerts_open_idx on public.price_alerts (triggered_at) where triggered_at is null;
create index if not exists price_alerts_user_idx on public.price_alerts (user_id, created_at desc);
