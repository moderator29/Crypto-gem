-- Crypto Gems core schema.
-- Identity comes from Privy: user ids are Privy DIDs stored as text (for example 'did:privy:abc123').
-- The database holds business data only. Every private table has RLS enabled with NO policy for anon or
-- authenticated roles, which denies direct access. The app reads and writes private data only from server
-- routes using the secret key, after verifying the caller's Privy access token and binding every query to
-- that user id. Public catalog data (packages, placements, published listings, live campaigns) has read-only policies.

create extension if not exists pgcrypto;

-- ── Roles ────────────────────────────────────────────────────────────────
create type public.app_role as enum ('user', 'project_owner', 'listing_reviewer', 'advertising_manager', 'support_agent', 'admin', 'super_admin');

create table public.profiles (
  id text primary key,
  display_name text check (char_length(display_name) <= 60),
  locale text not null default 'en',
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id text not null,
  role public.app_role not null,
  granted_by text,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ── Personal data ────────────────────────────────────────────────────────
create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.watchlist_items (
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  network_id text not null,
  address text not null,
  added_at timestamptz not null default now(),
  primary key (watchlist_id, network_id, address)
);
create index watchlist_items_token_idx on public.watchlist_items (network_id, address);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null check (char_length(name) between 1 and 60),
  filters jsonb not null,
  created_at timestamptz not null default now()
);

create table public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  network_id text not null,
  address text not null,
  direction text not null check (direction in ('above', 'below')),
  price_usd numeric not null check (price_usd > 0),
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ── Listings ─────────────────────────────────────────────────────────────
create table public.listing_packages (
  id text primary key,
  name text not null,
  price_usd numeric not null check (price_usd >= 0),
  duration_days integer,
  entitlements jsonb not null default '[]',
  active boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create type public.listing_status as enum ('draft', 'submitted', 'pending_review', 'approved', 'awaiting_payment', 'payment_confirmed', 'published', 'rejected', 'expired', 'refunded', 'cancelled', 'suspended');
create type public.verification_level as enum ('none', 'contract_verified', 'project_verified', 'links_verified');

create table public.token_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  mode text not null check (mode in ('express', 'standard')),
  network_id text,
  address text,
  name text not null check (char_length(name) <= 100),
  symbol text not null check (char_length(symbol) <= 20),
  logo_url text,
  description text check (char_length(description) <= 2000),
  description_zh text check (char_length(description_zh) <= 2000),
  links jsonb not null default '{}',
  detected jsonb,
  detected_at timestamptz,
  status public.listing_status not null default 'draft',
  verification public.verification_level not null default 'none',
  rejection_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One live submission per contract. EVM addresses are stored lowercased; other families keep their case.
create unique index token_submissions_unique_live on public.token_submissions (network_id, address) where status not in ('rejected', 'cancelled', 'expired', 'refunded') and address is not null;
create index token_submissions_owner_idx on public.token_submissions (owner_id);
create index token_submissions_status_idx on public.token_submissions (status);

-- ── Payments (shared by listings, ads and boosts) ────────────────────────
create type public.product_kind as enum ('listing', 'ad_campaign', 'boost');
create type public.payment_status as enum ('created', 'waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'failed', 'expired', 'refunded');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind public.product_kind not null,
  ref_id uuid not null,
  price_usd numeric not null check (price_usd >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'expired', 'refunded')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null default 'nowpayments',
  provider_payment_id text,
  pay_currency text not null,
  pay_network text,
  pay_amount numeric not null,
  pay_address text,
  actually_paid numeric,
  status public.payment_status not null default 'created',
  tx_hash text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_order_idx on public.payments (order_id);

-- Idempotency ledger: a webhook delivery is applied at most once.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  provider_payment_id text not null,
  status text not null,
  payload jsonb not null,
  fingerprint text not null unique,
  created_at timestamptz not null default now()
);

create table public.payment_methods (
  id text primary key,
  label text not null,
  provider_currency text not null,
  network text not null,
  enabled boolean not null default true,
  products public.product_kind[] not null default '{listing,ad_campaign,boost}',
  sort integer not null default 0
);

-- ── Advertising ──────────────────────────────────────────────────────────
create table public.advertising_placements (
  id text primary key,
  name text not null,
  description text,
  desktop_w integer not null,
  desktop_h integer not null,
  mobile_w integer not null,
  mobile_h integer not null,
  prices jsonb not null,
  exclusive boolean not null default false,
  slots integer not null default 1 check (slots > 0),
  min_days integer not null default 1,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create type public.campaign_status as enum ('draft', 'awaiting_payment', 'pending_creative', 'approved', 'scheduled', 'active', 'paused', 'completed', 'rejected', 'cancelled', 'refunded');

create table public.advertising_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  placement_id text not null references public.advertising_placements(id),
  submission_id uuid references public.token_submissions(id),
  headline text check (char_length(headline) <= 80),
  destination_url text not null check (destination_url ~ '^https://'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.campaign_status not null default 'draft',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index campaigns_serving_idx on public.advertising_campaigns (placement_id, status, starts_at, ends_at);

create table public.campaign_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.advertising_campaigns(id) on delete cascade,
  variant text not null check (variant in ('desktop', 'mobile')),
  storage_path text not null,
  width integer not null,
  height integer not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  review_note text
);

-- Exclusive placements cannot overlap: enforced by the database, not the UI.
create extension if not exists btree_gist;
create table public.exclusive_reservations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.advertising_campaigns(id) on delete cascade,
  placement_id text not null,
  slot integer not null,
  during tstzrange not null,
  exclude using gist (placement_id with =, slot with =, during with &&)
);

-- Impressions and clicks are deduplicated per visitor per window by `dedupe_key`.
create table public.ad_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.advertising_campaigns(id) on delete cascade,
  kind text not null check (kind in ('impression', 'click')),
  device text check (device in ('desktop', 'mobile', 'tablet')),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, kind, dedupe_key)
);
create index ad_events_campaign_idx on public.ad_events (campaign_id, created_at);

-- ── Boost ────────────────────────────────────────────────────────────────
create table public.boost_packs (
  id text primary key,
  name text not null,
  credits integer not null check (credits > 0),
  duration_hours integer not null check (duration_hours > 0),
  price_usd numeric not null check (price_usd >= 0),
  label text,
  allocations jsonb not null default '[]',
  active boolean not null default true,
  sort integer not null default 0
);

create table public.boost_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  submission_id uuid not null references public.token_submissions(id),
  pack_id text not null references public.boost_packs(id),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'active', 'expired', 'cancelled', 'refunded')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index boost_active_idx on public.boost_campaigns (status, ends_at);

-- ── Community, AI, admin ─────────────────────────────────────────────────
create table public.community_votes (
  user_id text not null,
  submission_id uuid not null references public.token_submissions(id) on delete cascade,
  day date not null default current_date,
  primary key (user_id, submission_id, day)
);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text,
  context jsonb,
  created_at timestamptz not null default now()
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id text,
  action text not null,
  target text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.saved_searches enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.listing_packages enable row level security;
alter table public.token_submissions enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_methods enable row level security;
alter table public.advertising_placements enable row level security;
alter table public.advertising_campaigns enable row level security;
alter table public.campaign_creatives enable row level security;
alter table public.exclusive_reservations enable row level security;
alter table public.ad_events enable row level security;
alter table public.boost_packs enable row level security;
alter table public.boost_campaigns enable row level security;
alter table public.community_votes enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.platform_settings enable row level security;
alter table public.admin_audit_logs enable row level security;


-- Public catalog data is readable by everyone; only staff change it (and every change is audited by the server).
create policy packages_public_read on public.listing_packages for select to anon, authenticated using (active);
create policy placements_public_read on public.advertising_placements for select to anon, authenticated using (active);
create policy boost_packs_public_read on public.boost_packs for select to anon, authenticated using (active);
create policy payment_methods_public_read on public.payment_methods for select to anon, authenticated using (enabled);

-- Submissions: public sees only published rows; owners see their own and may edit only while it is still a draft.
create policy submissions_public_read on public.token_submissions for select to anon, authenticated using (status = 'published');

-- Orders and payments are readable by their owner. Writes come only from the server with the secret key.

-- Campaigns: owners read their own, public sees live ones; creation and status changes are server-side.
create policy campaigns_public_live on public.advertising_campaigns for select to anon, authenticated using (status = 'active' and now() between starts_at and ends_at);
create policy creatives_public_live on public.campaign_creatives for select to anon, authenticated
  using (review_status = 'approved' and exists (select 1 from public.advertising_campaigns c where c.id = campaign_id and c.status = 'active' and now() between c.starts_at and c.ends_at));
create policy boost_public_live on public.boost_campaigns for select to anon, authenticated using (status = 'active' and now() between starts_at and ends_at);

-- exclusive_reservations has no policies: only the server's secret key can touch it.
