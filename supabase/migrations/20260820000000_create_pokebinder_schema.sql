-- ==============================================================================
-- POKÉBINDER TCG - SUPABASE POSTGRESQL SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- Migration Version: 20260820000000_create_pokebinder_schema.sql
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. PROFILES (Linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. USER SETTINGS
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_language text default 'pt',
  theme text default 'dark',
  view_mode text default 'binder',
  auto_sync boolean default true,
  updated_at timestamptz not null default now()
);

-- 3. COLLECTION ITEMS (Composite identity per user, card, variant, condition, language)
create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  variant text not null default 'normal',
  condition text not null default 'near_mint',
  language text not null default 'pt',
  quantity integer not null default 1 check (quantity >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint unique_user_card_variant_condition unique (user_id, card_id, variant, condition, language)
);

-- 4. DECKS
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  format text not null default 'Standard',
  cover_card_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 5. DECK CARDS
create table if not exists public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  variant text not null default 'normal',
  quantity integer not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_deck_card unique (deck_id, card_id, variant)
);

-- 6. FAVORITES
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  created_at timestamptz not null default now(),
  constraint unique_user_favorite unique (user_id, card_id)
);

-- 7. WISHLIST ITEMS
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  variant text not null default 'normal',
  target_price numeric(12,2),
  priority text not null default 'medium',
  quantity integer not null default 1 check (quantity >= 1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 8. MANUAL & LINKED MARKET PRICES (Liga Pokémon, MYPCards, BRL)
create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  variant text not null default 'normal',
  condition text not null default 'near_mint',
  source text not null,
  amount numeric(12,2) not null,
  currency text not null default 'BRL',
  origin text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_market_price unique (user_id, card_id, variant, condition, source)
);

-- 9. MARKET LINKS (Liga Pokémon & MYPCards URLs)
create table if not exists public.market_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  variant text not null default 'normal',
  condition text not null default 'near_mint',
  source text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_market_link unique (user_id, card_id, variant, condition, source)
);

-- 10. PRICE HISTORY (Personal price snapshots over time)
create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  variant text not null default 'normal',
  condition text not null default 'near_mint',
  source text not null,
  amount numeric(12,2) not null,
  currency text not null default 'BRL',
  recorded_at timestamptz not null default now()
);

-- 11. CARD PURCHASES (Acquisition log & cost basis)
create table if not exists public.card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  variant text not null default 'normal',
  condition text not null default 'near_mint',
  quantity integer not null default 1,
  price_paid numeric(12,2) not null,
  currency text not null default 'BRL',
  vendor text,
  notes text,
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 12. TRADE BINDER ITEMS
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  variant text not null default 'normal',
  condition text not null default 'near_mint',
  quantity integer not null default 1,
  price numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 13. PROCESSED SYNC OPERATIONS (Idempotency ledger)
create table if not exists public.processed_sync_operations (
  operation_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  processed_at timestamptz not null default now()
);

-- ==============================================================================
-- AUTOMATIC updated_at TRIGGER FUNCTION
-- ==============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply triggers
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists set_collection_items_updated_at on public.collection_items;
create trigger set_collection_items_updated_at before update on public.collection_items
for each row execute function public.handle_updated_at();

drop trigger if exists set_decks_updated_at on public.decks;
create trigger set_decks_updated_at before update on public.decks
for each row execute function public.handle_updated_at();

drop trigger if exists set_deck_cards_updated_at on public.deck_cards;
create trigger set_deck_cards_updated_at before update on public.deck_cards
for each row execute function public.handle_updated_at();

drop trigger if exists set_wishlist_items_updated_at on public.wishlist_items;
create trigger set_wishlist_items_updated_at before update on public.wishlist_items
for each row execute function public.handle_updated_at();

drop trigger if exists set_market_prices_updated_at on public.market_prices;
create trigger set_market_prices_updated_at before update on public.market_prices
for each row execute function public.handle_updated_at();

drop trigger if exists set_market_links_updated_at on public.market_links;
create trigger set_market_links_updated_at before update on public.market_links
for each row execute function public.handle_updated_at();

drop trigger if exists set_trades_updated_at on public.trades;
create trigger set_trades_updated_at before update on public.trades
for each row execute function public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.collection_items enable row level security;
alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;
alter table public.favorites enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.market_prices enable row level security;
alter table public.market_links enable row level security;
alter table public.price_history enable row level security;
alter table public.card_purchases enable row level security;
alter table public.trades enable row level security;
alter table public.processed_sync_operations enable row level security;

-- Profiles: Users manage their own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Settings:
create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);

-- Collection Items:
create policy "Users can view own collection" on public.collection_items for select using (auth.uid() = user_id);
create policy "Users can insert own collection" on public.collection_items for insert with check (auth.uid() = user_id);
create policy "Users can update own collection" on public.collection_items for update using (auth.uid() = user_id);
create policy "Users can delete own collection" on public.collection_items for delete using (auth.uid() = user_id);

-- Decks:
create policy "Users can view own decks" on public.decks for select using (auth.uid() = user_id);
create policy "Users can insert own decks" on public.decks for insert with check (auth.uid() = user_id);
create policy "Users can update own decks" on public.decks for update using (auth.uid() = user_id);
create policy "Users can delete own decks" on public.decks for delete using (auth.uid() = user_id);

-- Deck Cards:
create policy "Users can view own deck cards" on public.deck_cards for select using (auth.uid() = user_id);
create policy "Users can insert own deck cards" on public.deck_cards for insert with check (auth.uid() = user_id);
create policy "Users can update own deck cards" on public.deck_cards for update using (auth.uid() = user_id);
create policy "Users can delete own deck cards" on public.deck_cards for delete using (auth.uid() = user_id);

-- Favorites:
create policy "Users can view own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can insert own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete own favorites" on public.favorites for delete using (auth.uid() = user_id);

-- Wishlist:
create policy "Users can view own wishlist" on public.wishlist_items for select using (auth.uid() = user_id);
create policy "Users can insert own wishlist" on public.wishlist_items for insert with check (auth.uid() = user_id);
create policy "Users can update own wishlist" on public.wishlist_items for update using (auth.uid() = user_id);
create policy "Users can delete own wishlist" on public.wishlist_items for delete using (auth.uid() = user_id);

-- Market Prices:
create policy "Users can view own market prices" on public.market_prices for select using (auth.uid() = user_id);
create policy "Users can insert own market prices" on public.market_prices for insert with check (auth.uid() = user_id);
create policy "Users can update own market prices" on public.market_prices for update using (auth.uid() = user_id);
create policy "Users can delete own market prices" on public.market_prices for delete using (auth.uid() = user_id);

-- Market Links:
create policy "Users can view own market links" on public.market_links for select using (auth.uid() = user_id);
create policy "Users can insert own market links" on public.market_links for insert with check (auth.uid() = user_id);
create policy "Users can update own market links" on public.market_links for update using (auth.uid() = user_id);
create policy "Users can delete own market links" on public.market_links for delete using (auth.uid() = user_id);

-- Price History:
create policy "Users can view own price history" on public.price_history for select using (auth.uid() = user_id);
create policy "Users can insert own price history" on public.price_history for insert with check (auth.uid() = user_id);

-- Purchases:
create policy "Users can view own purchases" on public.card_purchases for select using (auth.uid() = user_id);
create policy "Users can insert own purchases" on public.card_purchases for insert with check (auth.uid() = user_id);
create policy "Users can update own purchases" on public.card_purchases for update using (auth.uid() = user_id);
create policy "Users can delete own purchases" on public.card_purchases for delete using (auth.uid() = user_id);

-- Trades:
create policy "Users can view own trades" on public.trades for select using (auth.uid() = user_id);
create policy "Users can insert own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can update own trades" on public.trades for update using (auth.uid() = user_id);
create policy "Users can delete own trades" on public.trades for delete using (auth.uid() = user_id);

-- Processed Sync Operations:
create policy "Users can view own sync ops" on public.processed_sync_operations for select using (auth.uid() = user_id);
create policy "Users can insert own sync ops" on public.processed_sync_operations for insert with check (auth.uid() = user_id);

-- Enable Realtime for synced tables
alter publication supabase_realtime add table public.collection_items;
alter publication supabase_realtime add table public.decks;
alter publication supabase_realtime add table public.deck_cards;
alter publication supabase_realtime add table public.favorites;
alter publication supabase_realtime add table public.wishlist_items;
alter publication supabase_realtime add table public.market_prices;
alter publication supabase_realtime add table public.market_links;
alter publication supabase_realtime add table public.card_purchases;
alter publication supabase_realtime add table public.trades;
