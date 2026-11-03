-- Votes carry a timestamp so a per-user cooldown can be enforced. One vote per user per project per day stays
-- enforced by the primary key; the cooldown across projects is enforced by the server route.
alter table public.community_votes add column if not exists created_at timestamptz not null default now();
create index if not exists community_votes_user_recent_idx on public.community_votes (user_id, created_at desc);
create index if not exists community_votes_submission_idx on public.community_votes (submission_id, created_at desc);
