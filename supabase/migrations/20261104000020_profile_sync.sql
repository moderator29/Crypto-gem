-- Profiles are created the first time a Privy user reaches the server. last_seen_at lets support see activity without any extra tracking.
alter table public.profiles add column if not exists last_seen_at timestamptz not null default now();
