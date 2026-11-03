-- Boost packs gain an explicit rotation priority. Priority orders sponsored rotation only. It never touches organic rank.
alter table public.boost_packs add column if not exists priority integer not null default 1;

update public.boost_packs set priority = case id when 'spark' then 1 when 'ignite' then 2 when 'surge' then 3 when 'momentum' then 4 when 'dominance' then 5 else priority end;
update public.boost_packs set allocations = case id
  when 'spark' then '["Sponsored slot in your chain''s discovery list","Boosted badge on your token page"]'::jsonb
  when 'ignite' then '["Everything in Spark","Sponsored slot in the trending list"]'::jsonb
  when 'surge' then '["Everything in Ignite","Featured discovery card","Eligible ecosystem placements"]'::jsonb
  when 'momentum' then '["Everything in Surge","Higher priority in sponsored rotation","New Listings and Hot Pairs sponsorship"]'::jsonb
  when 'dominance' then '["Everything in Momentum","Top priority in sponsored rotation","Premium sponsored visibility across selected destinations"]'::jsonb
  else allocations end;

-- A project can queue boosts back to back but never overlap itself.
create extension if not exists btree_gist;
alter table public.boost_campaigns add constraint boost_no_self_overlap exclude using gist (submission_id with =, tstzrange(starts_at, ends_at) with &&) where (status = 'active');
