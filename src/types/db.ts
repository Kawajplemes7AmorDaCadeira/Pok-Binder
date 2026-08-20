import { CardCondition, CardLanguage, CardVariant } from '../types';

export interface ExternalIds {
  tcgdex?: string;
  pokemonTcgApi?: string;
  tcgplayer?: string;
  cardmarket?: string;
}

export interface CardAttack {
  name: string;
  cost?: string[];
  damage?: string;
  effect?: string;
}

export interface CardAbility {
  type?: string;
  name: string;
  effect?: string;
}

export interface CardWeakness {
  type: string;
  value: string;
}

export interface CardResistance {
  type: string;
  value: string;
}

/**
 * Card entity represents the core game identity of a card regardless of print.
 */
export interface Card {
  id: string; // Internal ID e.g., 'PKB:CARD:pikachu' or UUID
  name: string;
  supertype?: 'Pokemon' | 'Trainer' | 'Energy' | string;
  subtypes?: string[];
  hp?: number;
  types?: string[];
  attacks?: CardAttack[];
  abilities?: CardAbility[];
  weaknesses?: CardWeakness[];
  resistances?: CardResistance[];
  retreatCost?: string[];
  regulationMark?: string;
  rules?: string[];
  externalIds?: ExternalIds;
}

/**
 * CardPrint entity represents a specific physical printing of a card in an expansion set.
 */
export interface CardPrint {
  id: string; // Internal ID e.g., 'PKB:PRINT:PT:sv03.5:025' or API ID
  cardId: string; // Internal Card ID link
  setId: string; // Set ID
  collectorNumber: string; // e.g. '025' or '183/182'
  printedTotal?: string; // Official set total or total printed
  rarity?: string;
  illustrator?: string;
  language: CardLanguage | string;
  imageSmall?: string;
  imageLarge?: string;
  isSecret?: boolean;
  externalIds?: ExternalIds;
}

/**
 * CollectionItem entity represents a physical card instance owned by the user.
 */
export interface CollectionItemEntity {
  id: string; // Unique UUID
  cardPrintId: string; // Link to CardPrint.id (or legacy cardId for backward compatibility)
  quantity: number;
  condition: CardCondition;
  variant: CardVariant;
  language: CardLanguage;
  acquiredAt?: string;
  acquiredPrice?: number;
  source?: string;
  location?: string; // e.g., 'Binder 1', 'Page 4, Slot 2'
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string; // Soft delete field
}

/**
 * Expansion Set entity
 */
export interface SetEntity {
  id: string; // e.g., 'sv03.5' or internal ID
  code?: string;
  name: string;
  seriesId?: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  officialCardCount: number;
  totalCardCount: number;
  externalIds?: ExternalIds;
}

/**
 * Series / Era entity
 */
export interface SeriesEntity {
  id: string; // e.g., 'sv'
  name: string;
  logo?: string;
}

/**
 * Deck Card Item inside a deck
 */
export interface DeckCardEntity {
  cardPrintId: string;
  quantity: number;
}

/**
 * Deck entity
 */
export interface DeckEntity {
  id: string;
  name: string;
  description?: string;
  format?: 'Standard' | 'Expanded' | 'Unlimited' | 'Casual' | string;
  coverCardPrintId?: string;
  cards: DeckCardEntity[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Favorite Entity
 */
export interface FavoriteEntity {
  id: string; // Favorite entry ID
  cardPrintId: string;
  createdAt: string;
}

/**
 * Wishlist Item Entity
 */
export interface WishlistItemEntity {
  id: string;
  cardPrintId: string;
  priority: 'low' | 'medium' | 'high';
  desiredQuantity: number;
  targetPrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Trade Item Entity
 */
export interface TradeItemEntity {
  id: string;
  cardPrintId: string;
  availableQuantity: number;
  notes?: string;
  updatedAt: string;
}

/**
 * Price Snapshot Entity
 */
export interface PriceSnapshotEntity {
  id: string;
  cardPrintId: string;
  provider: string;
  variant?: CardVariant;
  condition?: CardCondition;
  currency: 'BRL' | 'USD' | 'EUR' | string;
  market?: number;
  low?: number;
  mid?: number;
  high?: number;
  listings?: number;
  confidenceScore?: number;
  matchDetails?: string;
  recordedAt: string;
}

/**
 * Card Purchase Entry Entity
 */
export interface CardPurchaseEntity {
  id: string;
  cardId: string;
  variant: CardVariant;
  condition: CardCondition;
  quantity: number;
  pricePerCard: number;
  totalPaid: number;
  currency: 'BRL' | string;
  purchasedAt?: string;
  seller?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Key-Value Sync Metadata
 */
export interface SyncMetadataEntity {
  key: string;
  value: string;
  updatedAt: string;
}

/**
 * Catalog Version Tracking
 */
export interface CatalogVersionEntity {
  id: string;
  version: string;
  syncedAt: string;
  provider: string;
  cardCount: number;
  setCount: number;
  checksum?: string;
}
