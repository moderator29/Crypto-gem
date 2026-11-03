-- Admin area support: reviewer notes, read-path indexes and an append-only audit log.
-- Notes are written by the server (secret key) on behalf of a verified reviewer, and RLS
-- additionally restricts direct access to staff.

create table public.moderation_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.token_submissions(id) on delete cascade,
  author uuid not null references auth.users(id),
  kind text not null default 'note' check (kind in ('note', 'approve', 'reject', 'request_changes', 'publish', 'suspend')),
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index moderation_notes_submission_idx on public.moderation_notes (submission_id, created_at desc);

alter table public.moderation_notes enable row level security;

-- Any staff member can read the history. Only listing reviewers (and super admins, via has_role) can add to it directly.
-- No update or delete policy exists, so notes are immutable for every client role.
create policy moderation_notes_staff_read on public.moderation_notes for select to authenticated using (public.is_staff());
create policy moderation_notes_reviewer_insert on public.moderation_notes for insert to authenticated
  with check (public.has_role('listing_reviewer') and author = auth.uid());

-- Read-path indexes for the admin queues and tables.
create index orders_kind_ref_idx on public.orders (kind, ref_id);
create index orders_status_idx on public.orders (status, created_at desc);
create index payments_status_created_idx on public.payments (status, created_at desc);
create index token_submissions_status_updated_idx on public.token_submissions (status, updated_at desc);
create index campaign_creatives_pending_idx on public.campaign_creatives (campaign_id) where review_status = 'pending';
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, created_at desc);

-- The audit trail is append-only: rows cannot be edited or removed, even with the secret key.
create or replace function public.admin_audit_logs_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'admin_audit_logs is append-only';
end;
$$;
create trigger admin_audit_logs_no_update before update or delete on public.admin_audit_logs
  for each row execute function public.admin_audit_logs_immutable();
