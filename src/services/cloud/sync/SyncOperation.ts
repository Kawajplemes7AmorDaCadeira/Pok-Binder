/**
 * Strongly Typed Sync Operations for Local-First Offline Queue & Cloud Replication
 * Ensures strict type safety (NO payload: any).
 */

import { CardCondition, CardLanguage, CardVariant } from '../../../types';
import { MarketSource } from '../../../types/market';

export type SyncEntityType =
  | 'collection'
  | 'deck'
  | 'favorite'
  | 'wishlist'
  | 'market_price'
  | 'market_link'
  | 'purchase'
  | 'trade'
  | 'user_settings';

export type SyncAction = 'UPSERT' | 'INCREMENT' | 'DECREMENT' | 'DELETE';

export interface BaseSyncOperation {
  id: string; // Unique operationId for idempotency
  entityType: SyncEntityType;
  action: SyncAction;
  timestamp: string;
  retryCount: number;
  originDeviceId: string;
}

// 1. Collection Operations
export interface CollectionUpsertOperation extends BaseSyncOperation {
  entityType: 'collection';
  action: 'UPSERT';
  data: {
    id: string;
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    language: CardLanguage;
    quantity: number;
    notes?: string;
  };
}

export interface CollectionIncrementOperation extends BaseSyncOperation {
  entityType: 'collection';
  action: 'INCREMENT';
  data: {
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    language: CardLanguage;
    delta: number;
    notes?: string;
  };
}

export interface CollectionDecrementOperation extends BaseSyncOperation {
  entityType: 'collection';
  action: 'DECREMENT';
  data: {
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    language: CardLanguage;
    delta: number;
  };
}

export interface CollectionDeleteOperation extends BaseSyncOperation {
  entityType: 'collection';
  action: 'DELETE';
  data: {
    id: string;
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    language: CardLanguage;
  };
}

// 2. Deck Operations
export interface DeckUpsertOperation extends BaseSyncOperation {
  entityType: 'deck';
  action: 'UPSERT';
  data: {
    id: string;
    name: string;
    description?: string;
    format: string;
    coverCardId?: string;
    cards: Array<{ cardId: string; variant?: CardVariant; quantity: number }>;
  };
}

export interface DeckDeleteOperation extends BaseSyncOperation {
  entityType: 'deck';
  action: 'DELETE';
  data: {
    id: string;
  };
}

// 3. Favorite Operations
export interface FavoriteToggleOperation extends BaseSyncOperation {
  entityType: 'favorite';
  action: 'UPSERT' | 'DELETE';
  data: {
    cardId: string;
    isFavorite: boolean;
  };
}

// 4. Wishlist Operations
export interface WishlistUpsertOperation extends BaseSyncOperation {
  entityType: 'wishlist';
  action: 'UPSERT';
  data: {
    id: string;
    cardId: string;
    variant: CardVariant;
    targetPrice?: number;
    priority: 'low' | 'medium' | 'high';
    quantity: number;
    notes?: string;
  };
}

export interface WishlistDeleteOperation extends BaseSyncOperation {
  entityType: 'wishlist';
  action: 'DELETE';
  data: {
    id: string;
  };
}

// 5. Market Price Operations
export interface MarketPriceUpsertOperation extends BaseSyncOperation {
  entityType: 'market_price';
  action: 'UPSERT';
  data: {
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    source: MarketSource;
    amount: number;
    currency: string;
    origin?: string;
  };
}

// 6. Market Link Operations
export interface MarketLinkUpsertOperation extends BaseSyncOperation {
  entityType: 'market_link';
  action: 'UPSERT';
  data: {
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    source: MarketSource;
    url: string;
  };
}

export interface MarketLinkDeleteOperation extends BaseSyncOperation {
  entityType: 'market_link';
  action: 'DELETE';
  data: {
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    source: MarketSource;
  };
}

// 7. Purchase Operations
export interface PurchaseUpsertOperation extends BaseSyncOperation {
  entityType: 'purchase';
  action: 'UPSERT';
  data: {
    id: string;
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    quantity: number;
    pricePaid: number;
    currency: string;
    vendor?: string;
    notes?: string;
    purchasedAt: string;
  };
}

// 8. Trade Operations
export interface TradeUpsertOperation extends BaseSyncOperation {
  entityType: 'trade';
  action: 'UPSERT';
  data: {
    id: string;
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    quantity: number;
    price?: number;
    notes?: string;
  };
}

export interface TradeDeleteOperation extends BaseSyncOperation {
  entityType: 'trade';
  action: 'DELETE';
  data: {
    id: string;
  };
}

// 9. Settings Operations
export interface SettingsUpsertOperation extends BaseSyncOperation {
  entityType: 'user_settings';
  action: 'UPSERT';
  data: {
    preferredLanguage?: CardLanguage;
    theme?: 'light' | 'dark';
    viewMode?: 'grid' | 'binder' | 'compact';
    autoSync?: boolean;
  };
}

export type SyncOperation =
  | CollectionUpsertOperation
  | CollectionIncrementOperation
  | CollectionDecrementOperation
  | CollectionDeleteOperation
  | DeckUpsertOperation
  | DeckDeleteOperation
  | FavoriteToggleOperation
  | WishlistUpsertOperation
  | WishlistDeleteOperation
  | MarketPriceUpsertOperation
  | MarketLinkUpsertOperation
  | MarketLinkDeleteOperation
  | PurchaseUpsertOperation
  | TradeUpsertOperation
  | TradeDeleteOperation
  | SettingsUpsertOperation;
