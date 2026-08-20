import 'fake-indexeddb/auto';
import Dexie, { Table } from 'dexie';
import {
  Card,
  CardPrint,
  CardPurchaseEntity,
  CatalogVersionEntity,
  CollectionItemEntity,
  DeckEntity,
  FavoriteEntity,
  PriceSnapshotEntity,
  SeriesEntity,
  SetEntity,
  SyncMetadataEntity,
  TradeItemEntity,
  WishlistItemEntity,
} from '../types/db';

export class PokeBinderDatabase extends Dexie {
  cards!: Table<Card, string>;
  cardPrints!: Table<CardPrint, string>;
  sets!: Table<SetEntity, string>;
  series!: Table<SeriesEntity, string>;
  collectionItems!: Table<CollectionItemEntity, string>;
  decks!: Table<DeckEntity, string>;
  favorites!: Table<FavoriteEntity, string>;
  wishlist!: Table<WishlistItemEntity, string>;
  tradeItems!: Table<TradeItemEntity, string>;
  prices!: Table<PriceSnapshotEntity, string>;
  cardPurchases!: Table<CardPurchaseEntity, string>;
  syncMetadata!: Table<SyncMetadataEntity, string>;
  catalogVersions!: Table<CatalogVersionEntity, string>;
  cloudStore!: Table<{ userId: string; data: any; updatedAt: string }, string>;

  constructor() {
    super('PokeBinderDatabase');

    // Schema version 1 definition
    this.version(1).stores({
      cards: 'id, name, supertype',
      cardPrints: 'id, cardId, setId, collectorNumber, language, [setId+collectorNumber]',
      sets: 'id, seriesId, releaseDate',
      series: 'id, name',
      collectionItems: 'id, cardPrintId, variant, condition, language, updatedAt, deletedAt',
      decks: 'id, format, updatedAt, deletedAt',
      favorites: 'id, cardPrintId, createdAt',
      wishlist: 'id, cardPrintId, priority, createdAt',
      tradeItems: 'id, cardPrintId, updatedAt',
      prices: 'id, cardPrintId, recordedAt',
      syncMetadata: 'key',
      catalogVersions: 'id, version, syncedAt',
    });

    // Schema version 2 definition with enhanced search and compound indexes
    this.version(2).stores({
      cards: 'id, name, supertype, regulationMark, *types',
      cardPrints: 'id, cardId, setId, collectorNumber, language, [setId+collectorNumber], [setId+language]',
      sets: 'id, seriesId, releaseDate, name',
      series: 'id, name',
      collectionItems: 'id, cardPrintId, variant, condition, language, quantity, updatedAt, deletedAt, [cardPrintId+variant]',
      decks: 'id, format, name, updatedAt, deletedAt',
      favorites: 'id, cardPrintId, createdAt',
      wishlist: 'id, cardPrintId, priority, createdAt',
      tradeItems: 'id, cardPrintId, updatedAt',
      prices: 'id, cardPrintId, recordedAt',
      syncMetadata: 'key',
      catalogVersions: 'id, version, syncedAt',
    });

    // Schema version 3 definition with purchase history and variant-aware market pricing
    this.version(3).stores({
      cards: 'id, name, supertype, regulationMark, *types',
      cardPrints: 'id, cardId, setId, collectorNumber, language, [setId+collectorNumber], [setId+language]',
      sets: 'id, seriesId, releaseDate, name',
      series: 'id, name',
      collectionItems: 'id, cardPrintId, variant, condition, language, quantity, updatedAt, deletedAt, [cardPrintId+variant]',
      decks: 'id, format, name, updatedAt, deletedAt',
      favorites: 'id, cardPrintId, createdAt',
      wishlist: 'id, cardPrintId, priority, createdAt',
      tradeItems: 'id, cardPrintId, updatedAt',
      prices: 'id, cardPrintId, provider, variant, condition, recordedAt, [cardPrintId+variant], [cardPrintId+provider]',
      cardPurchases: 'id, cardId, variant, condition, purchasedAt, createdAt, [cardId+variant]',
      syncMetadata: 'key',
      catalogVersions: 'id, version, syncedAt',
    });

    // Schema version 4 definition with IndexedDB cloudStore to prevent localStorage quota issues
    this.version(4).stores({
      cards: 'id, name, supertype, regulationMark, *types',
      cardPrints: 'id, cardId, setId, collectorNumber, language, [setId+collectorNumber], [setId+language]',
      sets: 'id, seriesId, releaseDate, name',
      series: 'id, name',
      collectionItems: 'id, cardPrintId, variant, condition, language, quantity, updatedAt, deletedAt, [cardPrintId+variant]',
      decks: 'id, format, name, updatedAt, deletedAt',
      favorites: 'id, cardPrintId, createdAt',
      wishlist: 'id, cardPrintId, priority, createdAt',
      tradeItems: 'id, cardPrintId, updatedAt',
      prices: 'id, cardPrintId, provider, variant, condition, recordedAt, [cardPrintId+variant], [cardPrintId+provider]',
      cardPurchases: 'id, cardId, variant, condition, purchasedAt, createdAt, [cardId+variant]',
      syncMetadata: 'key',
      catalogVersions: 'id, version, syncedAt',
      cloudStore: 'userId',
    });
  }
}

export const db = new PokeBinderDatabase();
