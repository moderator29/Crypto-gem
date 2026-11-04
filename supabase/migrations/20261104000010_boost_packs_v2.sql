-- Boost packs v2: six tiers from 100 to 1,500 USD. Older tiers stay in the table for historical campaigns but are switched off.
update public.boost_packs set active = false where id in ('ignite', 'momentum', 'dominance');

insert into public.boost_packs (id, name, credits, duration_hours, price_usd, label, sort, priority, allocations, active) values
  ('spark', 'Spark', 100, 12, 100, null, 1, 1, '["Sponsored strip on Discover for 12 hours","Boosted badge on coin lists and your token page","Standard rotation priority"]'::jsonb, true),
  ('rise', 'Rise', 250, 24, 250, null, 2, 2, '["Everything in Spark, for 24 hours","Rotation priority above Spark"]'::jsonb, true),
  ('surge', 'Surge', 500, 48, 500, 'Popular', 3, 3, '["Everything in Rise, for 48 hours","Rotation priority above Rise","Highlighted card in the sponsored strip"]'::jsonb, true),
  ('rocket', 'Rocket', 749, 72, 749, 'Best Value', 4, 4, '["Everything in Surge, for 72 hours","Rotation priority above Surge","Wider highlighted card"]'::jsonb, true),
  ('orbit', 'Orbit', 1250, 120, 1250, null, 5, 5, '["Everything in Rocket, for 5 days","Rotation priority above Rocket","Premium card style in the sponsored strip"]'::jsonb, true),
  ('moon', 'Moon', 1500, 168, 1500, 'Premium', 6, 6, '["Everything in Orbit, for 7 days","Top rotation priority, shown first","Premium card style"]'::jsonb, true)
on conflict (id) do update set name = excluded.name, credits = excluded.credits, duration_hours = excluded.duration_hours, price_usd = excluded.price_usd,
  label = excluded.label, sort = excluded.sort, priority = excluded.priority, allocations = excluded.allocations, active = true;
