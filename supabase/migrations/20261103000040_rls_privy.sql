-- Row Level Security keyed to the Privy user id.
--
-- Identity is Privy, so there is no auth.users row. The signed-in user id is the Privy DID carried in the
-- JWT "sub" claim. A server route that has verified a Privy access token may mint a short-lived Supabase JWT
-- (role authenticated, sub = the DID) so that direct client access is limited by the policies below.
-- Server routes that use the secret key bypass RLS on purpose and bind every query to the verified user id.
-- Defence in depth: even a leaked publishable key plus a valid token can only reach that user's own rows.

create or replace function public.app_uid() returns text
language sql stable as $$
  select coalesce(nullif(auth.jwt() ->> 'sub', ''), '');
$$;

create or replace function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = public.app_uid() and role in (r, 'super_admin'));
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = public.app_uid() and role in ('listing_reviewer', 'advertising_manager', 'support_agent', 'admin', 'super_admin'));
$$;

-- Personal data: owner only.
create policy profiles_self on public.profiles for all to authenticated using (id = public.app_uid()) with check (id = public.app_uid());
create policy roles_read_self on public.user_roles for select to authenticated using (user_id = public.app_uid() or public.has_role('admin'));
create policy watchlists_own on public.watchlists for all to authenticated using (user_id = public.app_uid()) with check (user_id = public.app_uid());
create policy watchlist_items_own on public.watchlist_items for all to authenticated
  using (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = public.app_uid()))
  with check (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = public.app_uid()));
create policy saved_searches_own on public.saved_searches for all to authenticated using (user_id = public.app_uid()) with check (user_id = public.app_uid());
create policy price_alerts_own on public.price_alerts for all to authenticated using (user_id = public.app_uid()) with check (user_id = public.app_uid());
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = public.app_uid());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = public.app_uid()) with check (user_id = public.app_uid());
create policy ai_conversations_own on public.ai_conversations for all to authenticated using (user_id = public.app_uid()) with check (user_id = public.app_uid());
create policy ai_messages_own on public.ai_messages for all to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = public.app_uid()))
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = public.app_uid()));
create policy votes_own on public.community_votes for all to authenticated using (user_id = public.app_uid()) with check (user_id = public.app_uid());

-- Catalog: public read already exists. Writes only by the matching staff role.
create policy packages_staff_write on public.listing_packages for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy placements_staff_write on public.advertising_placements for all to authenticated using (public.has_role('advertising_manager')) with check (public.has_role('advertising_manager'));
create policy boost_packs_staff_write on public.boost_packs for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy payment_methods_staff_write on public.payment_methods for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

-- Submissions: owners read their own, insert drafts only, edit only while draft. Reviewers manage the rest.
create policy submissions_owner_read on public.token_submissions for select to authenticated using (owner_id = public.app_uid());
create policy submissions_owner_insert on public.token_submissions for insert to authenticated with check (owner_id = public.app_uid() and status = 'draft' and verification = 'none');
create policy submissions_owner_update on public.token_submissions for update to authenticated using (owner_id = public.app_uid() and status = 'draft') with check (owner_id = public.app_uid() and status in ('draft', 'submitted') and verification = 'none');
create policy submissions_staff_all on public.token_submissions for all to authenticated using (public.has_role('listing_reviewer')) with check (public.has_role('listing_reviewer'));

-- Money: readable by the owner, never writable from a client. Only the server's secret key writes orders and payments.
create policy orders_read_own on public.orders for select to authenticated using (user_id = public.app_uid() or public.has_role('admin'));
create policy payments_read_own on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = public.app_uid() or public.has_role('admin'))));
create policy payment_events_admin on public.payment_events for select to authenticated using (public.has_role('admin'));

-- Advertising and boost: owners read their own, advertising managers and admins read all. Writes are server side.
create policy campaigns_owner_read on public.advertising_campaigns for select to authenticated using (owner_id = public.app_uid() or public.has_role('advertising_manager'));
create policy creatives_owner_read on public.campaign_creatives for select to authenticated
  using (exists (select 1 from public.advertising_campaigns c where c.id = campaign_id and (c.owner_id = public.app_uid() or public.has_role('advertising_manager'))));
create policy ad_events_owner_read on public.ad_events for select to authenticated
  using (exists (select 1 from public.advertising_campaigns c where c.id = campaign_id and (c.owner_id = public.app_uid() or public.has_role('advertising_manager'))));
create policy boost_owner_read on public.boost_campaigns for select to authenticated using (owner_id = public.app_uid() or public.has_role('admin'));

-- Platform configuration, audit trail and reviewer notes are staff only.
create policy settings_admin on public.platform_settings for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
create policy audit_admin_read on public.admin_audit_logs for select to authenticated using (public.has_role('admin'));
create policy moderation_notes_staff_read on public.moderation_notes for select to authenticated using (public.is_staff());
create policy moderation_notes_reviewer_insert on public.moderation_notes for insert to authenticated with check (public.has_role('listing_reviewer') and author = public.app_uid());
-- exclusive_reservations has no policy: only the secret key can touch it.
