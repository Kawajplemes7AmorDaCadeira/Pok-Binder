/**
 * Supabase Database Rows & Cloud Model Types for PokéBinder TCG
 */

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsRow {
  user_id: string;
  preferred_language: string;
  theme: string;
  view_mode: string;
  auto_sync: boolean;
  updated_at: string;
}

export interface CollectionItemRow {
  id: string;
  user_id: string;
  card_id: string;
  variant: string;
  condition: string;
  language: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DeckRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  format: string;
  cover_card_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DeckCardRow {
  id: string;
  deck_id: string;
  user_id: string;
  card_id: string;
  variant: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  card_id: string;
  created_at: string;
}

export interface WishlistItemRow {
  id: string;
  user_id: string;
  card_id: string;
  variant: string;
  target_price: number | null;
  priority: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MarketPriceRow {
  id: string;
  user_id: string;
  card_id: string;
  variant: string;
  condition: string;
  source: string;
  amount: number;
  currency: string;
  origin: string;
  created_at: string;
  updated_at: string;
}

export interface MarketLinkRow {
  id: string;
  user_id: string;
  card_id: string;
  variant: string;
  condition: string;
  source: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface PriceHistoryRow {
  id: string;
  user_id: string;
  card_id: string;
  variant: string;
  condition: string;
  source: string;
  amount: number;
  currency: string;
  recorded_at: string;
}

export interface CardPurchaseRow {
  id: string;
  user_id: string;
  card_id: string;
  variant: string;
  condition: string;
  quantity: number;
  price_paid: number;
  currency: string;
  vendor: string | null;
  notes: string | null;
  purchased_at: string;
  created_at: string;
}

export interface TradeRow {
  id: string;
  user_id: string;
  card_id: string;
  variant: string;
  condition: string;
  quantity: number;
  price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProcessedSyncOpRow {
  operation_id: string;
  user_id: string;
  processed_at: string;
}
