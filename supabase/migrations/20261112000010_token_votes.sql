-- Upvotes for any token shown on the site (not only listed projects). One vote per user per token per UTC day.
-- Rows are private to the voter. Public totals are read by the server and returned as counts only.
create table public.token_votes (
  user_id text not null,
  network_id text not null,
  address text not null,
  voted_on date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  primary key (user_id, network_id, address, voted_on)
);
create index token_votes_token_idx on public.token_votes (network_id, address, created_at desc);
create index token_votes_user_idx on public.token_votes (user_id, created_at desc);
alter table public.token_votes enable row level security;
create policy token_votes_own on public.token_votes for all to authenticated using (user_id = public.app_uid()) with check (user_id = public.app_uid());
