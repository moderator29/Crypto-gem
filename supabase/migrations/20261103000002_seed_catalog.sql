-- Default commercial catalog. Administrators own these rows afterwards; edit them in the admin area, not here.

insert into public.listing_packages (id, name, price_usd, entitlements, sort) values
  ('starter', 'Starter', 300, '["express_review","published_page","search_discovery","standard_placement"]', 1),
  ('pro', 'Pro', 700, '["express_review","published_page","search_discovery","featured_new_listings","scheduled_visibility","campaign_reporting"]', 2),
  ('premium', 'Premium', 1000, '["express_review","published_page","search_discovery","featured_new_listings","homepage_spotlight","priority_scheduling","enhanced_analytics"]', 3)
on conflict (id) do nothing;

insert into public.boost_packs (id, name, credits, duration_hours, price_usd, label, sort) values
  ('spark', 'Spark', 50, 6, 30, null, 1),
  ('ignite', 'Ignite', 100, 12, 50, null, 2),
  ('surge', 'Surge', 200, 24, 100, 'Popular', 3),
  ('momentum', 'Momentum', 350, 48, 175, 'Best Value', 4),
  ('dominance', 'Dominance', 500, 72, 250, 'Premium', 5)
on conflict (id) do nothing;

insert into public.advertising_placements (id, name, description, desktop_w, desktop_h, mobile_w, mobile_h, prices, exclusive, slots) values
  ('hero', 'Homepage Hero', 'Large rotating banner at the top of Discover', 1600, 500, 960, 540, '{"1":350,"3":945,"7":1540}', false, 5),
  ('featured', 'Featured Banner', 'Wide banner below the hero', 1200, 300, 960, 400, '{"1":250,"3":675,"7":1190}', false, 4),
  ('side', 'Side Banner', 'Rotating card beside trending', 600, 600, 960, 400, '{"1":200,"3":540,"7":980}', false, 6),
  ('trending', 'Trending Sponsorship', 'Labelled sponsored slots beside the trending list', 640, 200, 640, 200, '{"1":500,"3":1350,"7":2450}', true, 10),
  ('new-listings', 'New Listings Sponsorship', 'Exposure alongside new listings', 640, 200, 640, 200, '{"1":250,"3":675,"7":1190}', false, 6),
  ('hot-pairs', 'Hot Pairs Sponsorship', 'Advertising around new liquidity pools', 640, 200, 640, 200, '{"1":250,"3":675,"7":1190}', false, 6),
  ('token-page', 'Token Page Ad', 'Contextual placement on token pages', 600, 400, 960, 400, '{"1":150,"3":405,"7":735}', false, 4),
  ('ecosystem', 'Ecosystem Spotlight', 'Spotlight for one chain', 1200, 300, 960, 400, '{"1":300,"3":810,"7":1470}', true, 1)
on conflict (id) do nothing;

-- Provider currency codes MUST be confirmed against NOWPayments GET /v1/merchant/coins before enabling.
-- They are seeded disabled so nothing is offered until an administrator verifies and switches it on.
insert into public.payment_methods (id, label, provider_currency, network, enabled, sort) values
  ('usdt-bsc', 'USDT', 'usdtbsc', 'BNB Smart Chain', false, 1),
  ('usdt-eth', 'USDT', 'usdterc20', 'Ethereum', false, 2),
  ('usdt-sol', 'USDT', 'usdtsol', 'Solana', false, 3),
  ('usdc-eth', 'USDC', 'usdc', 'Ethereum', false, 4),
  ('usdc-base', 'USDC', 'usdcbase', 'Base', false, 5),
  ('usdc-sol', 'USDC', 'usdcsol', 'Solana', false, 6),
  ('sol', 'SOL', 'sol', 'Solana', false, 7),
  ('bnb', 'BNB', 'bnbbsc', 'BNB Smart Chain', false, 8),
  ('eth', 'ETH', 'eth', 'Ethereum', false, 9),
  ('avax', 'AVAX', 'avax', 'Avalanche', false, 10)
on conflict (id) do nothing;
