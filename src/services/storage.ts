import {
  CardCondition,
  CardLanguage,
  CardVariant,
  CollectionItem,
  Deck,
  UserSettings,
  WishlistItem,
} from '../types';
import { CollectionRepository } from '../database/repositories/CollectionRepository';
import { DeckRepository } from '../database/repositories/DeckRepository';
import { FavoriteRepository } from '../database/repositories/FavoriteRepository';
import { migrateFromLocalStorageIfNeeded } from '../database/migrations/localStorageMigration';
import { CollectionItemEntity, DeckEntity, FavoriteEntity } from '../types/db';
import { SyncQueue } from './cloud/sync/SyncQueue';
import { SyncService } from './cloud/sync/SyncService';

const STORAGE_KEYS = {
  COLLECTION: 'pokebinder_collection_v1',
  DECKS: 'pokebinder_decks_v1',
  FAVORITES: 'pokebinder_favorites_v1',
  SETTINGS: 'pokebinder_settings_v1',
};

const DEFAULT_SETTINGS: UserSettings = {
  preferredLanguage: 'pt',
  theme: 'dark',
  viewMode: 'binder',
  autoSync: true,
};

export class StorageService {
  private static isInitialized = false;

  /**
   * Initializes IndexedDB database & runs automatic migration from localStorage
   */
  public static async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await migrateFromLocalStorageIfNeeded();
      this.isInitialized = true;
      // Sync memory cache to IndexedDB state
      await this.syncLocalStorageWithIndexedDB();
    } catch (err) {
      console.error('StorageService init error', err);
    }
  }

  /**
   * Helper to sync local state with IndexedDB
   */
  private static async syncLocalStorageWithIndexedDB(): Promise<void> {
    try {
      // 1. Collection
      const localCollStr = localStorage.getItem(STORAGE_KEYS.COLLECTION);
      if (localCollStr && localCollStr !== '[]') {
        try {
          const parsed: CollectionItem[] = JSON.parse(localCollStr);
          const entities: CollectionItemEntity[] = parsed.map((i) => ({
            id: i.id,
            cardPrintId: i.cardId,
            quantity: i.quantity,
            condition: i.condition,
            variant: i.variant,
            language: i.language,
            notes: i.notes,
            createdAt: i.createdAt,
            updatedAt: i.updatedAt,
          }));
          await CollectionRepository.clearAll();
          await CollectionRepository.bulkSave(entities);
        } catch {}
      } else {
        const dbCollection = await CollectionRepository.getAll();
        if (dbCollection.length > 0) {
          const legacyItems: CollectionItem[] = dbCollection.map((item) => ({
            id: item.id,
            cardId: item.cardPrintId,
            language: item.language,
            variant: item.variant,
            quantity: item.quantity,
            condition: item.condition,
            notes: item.notes,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));
          localStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(legacyItems));
        }
      }

      // 2. Decks
      const localDeckStr = localStorage.getItem(STORAGE_KEYS.DECKS);
      if (!localDeckStr || localDeckStr === '[]') {
        const dbDecks = await DeckRepository.getAll();
        if (dbDecks.length > 0) {
          const legacyDecks: Deck[] = dbDecks.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            format: (d.format as any) || 'Standard',
            coverCardId: d.coverCardPrintId,
            cards: d.cards.map((c) => ({ cardId: c.cardPrintId, quantity: c.quantity })),
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          }));
          localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(legacyDecks));
        }
      }

      // 3. Favorites
      const localFavStr = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (!localFavStr || localFavStr === '[]') {
        const dbFavs = await FavoriteRepository.getCardPrintIds();
        if (dbFavs.length > 0) {
          localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(dbFavs));
        }
      }
    } catch (e) {
      console.warn('Failed syncLocalStorageWithIndexedDB', e);
    }
  }

  /**
   * Collection Management (Sync & Async)
   */
  public static getCollection(): CollectionItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COLLECTION);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static async getCollectionAsync(): Promise<CollectionItem[]> {
    await this.init();
    const items = await CollectionRepository.getAll();
    return items.map((item) => ({
      id: item.id,
      cardId: item.cardPrintId,
      language: item.language,
      variant: item.variant,
      quantity: item.quantity,
      condition: item.condition,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  public static saveCollection(items: CollectionItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(items));
      // Asynchronously update IndexedDB
      const entities: CollectionItemEntity[] = items.map((i) => ({
        id: i.id,
        cardPrintId: i.cardId,
        quantity: i.quantity,
        condition: i.condition,
        variant: i.variant,
        language: i.language,
        notes: i.notes,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }));
      (async () => {
        await CollectionRepository.clearAll();
        await CollectionRepository.bulkSave(entities);
      })().catch((err) =>
        console.error('Failed to save collection to IndexedDB', err)
      );
    } catch (e) {
      console.error('Error saving collection', e);
    }
  }

  public static removeSampleCards(): CollectionItem[] {
    const items = this.getCollection();
    const filtered = items.filter((item) => !item.id.startsWith('col_'));
    this.saveCollection(filtered);
    CollectionRepository.removeSampleCards().catch(() => {});
    return filtered;
  }

  public static clearCollection(): void {
    this.saveCollection([]);
    CollectionRepository.clearAll().catch(() => {});
  }

  public static updateCardQuantity(
    cardId: string,
    delta: number,
    variant: CardVariant = 'normal',
    language: CardLanguage = 'pt',
    condition: CardCondition = 'near_mint'
  ): CollectionItem[] {
    const collection = this.getCollection();
    const existingIndex = collection.findIndex(
      (item) => item.cardId === cardId && item.variant === variant && item.language === language
    );

    let finalItem: CollectionItem | undefined;

    if (existingIndex >= 0) {
      const newQty = collection[existingIndex].quantity + delta;
      if (newQty <= 0) {
        collection.splice(existingIndex, 1);
      } else {
        collection[existingIndex].quantity = newQty;
        collection[existingIndex].updatedAt = new Date().toISOString();
        finalItem = collection[existingIndex];
      }
    } else if (delta > 0) {
      const newItem: CollectionItem = {
        id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        cardId,
        language,
        variant,
        quantity: delta,
        condition,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      collection.push(newItem);
      finalItem = newItem;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.COLLECTION, JSON.stringify(collection));
    } catch {}

    CollectionRepository.updateQuantity(cardId, delta, variant, language, condition).catch(() => {});

    // Enqueue cloud sync operation
    try {
      if (delta > 0) {
        SyncQueue.enqueue({
          entityType: 'collection',
          action: 'INCREMENT',
          data: {
            cardId,
            variant,
            condition,
            language,
            delta,
            itemId: finalItem?.id,
          },
        });
      } else {
        SyncQueue.enqueue({
          entityType: 'collection',
          action: 'DECREMENT',
          data: {
            cardId,
            variant,
            condition,
            language,
            delta: Math.abs(delta),
          },
        });
      }
      SyncService.flushQueue().catch(() => {});
    } catch (e) {
      console.warn('Could not enqueue cloud sync op', e);
    }

    return collection;
  }

  public static getCardTotalQuantity(cardId: string): number {
    const collection = this.getCollection();
    return collection
      .filter((item) => item.cardId === cardId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  public static getCardVariantQuantity(cardId: string, variant: CardVariant): number {
    const collection = this.getCollection();
    return collection
      .filter((item) => item.cardId === cardId && item.variant === variant)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  public static getCardVariantsBreakdown(
    cardId: string
  ): { variant: CardVariant; quantity: number; condition: CardCondition }[] {
    const collection = this.getCollection();
    return collection
      .filter((item) => item.cardId === cardId && item.quantity > 0)
      .map((item) => ({
        variant: item.variant,
        quantity: item.quantity,
        condition: item.condition,
      }));
  }

  /**
   * Convert an existing collection card from one variant to another (e.g. Normal -> Holo)
   */
  public static convertCardVariant(
    cardId: string,
    fromVariant: CardVariant,
    toVariant: CardVariant
  ): CollectionItem[] {
    if (fromVariant === toVariant) return this.getCollection();

    const collection = this.getCollection();
    const fromIndex = collection.findIndex(
      (item) => item.cardId === cardId && item.variant === fromVariant
    );

    if (fromIndex === -1) return collection;

    const fromItem = collection[fromIndex];
    const transferQuantity = fromItem.quantity;

    // Remove from original variant
    collection.splice(fromIndex, 1);

    // Merge into target variant
    const targetIndex = collection.findIndex(
      (item) => item.cardId === cardId && item.variant === toVariant
    );

    if (targetIndex >= 0) {
      collection[targetIndex].quantity += transferQuantity;
      collection[targetIndex].updatedAt = new Date().toISOString();
    } else {
      collection.push({
        ...fromItem,
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        variant: toVariant,
        quantity: transferQuantity,
        updatedAt: new Date().toISOString(),
      });
    }

    this.saveCollection(collection);

    // Also migrate purchase history if any exists for fromVariant
    try {
      import('../database/repositories/PurchaseRepository').then(async ({ PurchaseRepository }) => {
        const purchases = await PurchaseRepository.getByCardIdAndVariant(cardId, fromVariant);
        for (const p of purchases) {
          await PurchaseRepository.updatePurchase({
            ...p,
            variant: toVariant,
          });
        }
      });
    } catch {}

    return collection;
  }

  /**
   * Decks Management
   */
  public static getDecks(): Deck[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DECKS);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveDecks(decks: Deck[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
      const entities: DeckEntity[] = decks.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        format: d.format || 'Standard',
        coverCardPrintId: d.coverCardId,
        cards: d.cards.map((c) => ({ cardPrintId: c.cardId, quantity: c.quantity })),
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
      DeckRepository.bulkSave(entities).catch(() => {});
    } catch (e) {
      console.error('Error saving decks', e);
    }
  }

  public static saveDeck(deck: Deck): Deck[] {
    const decks = this.getDecks();
    const idx = decks.findIndex((d) => d.id === deck.id);
    deck.updatedAt = new Date().toISOString();

    if (idx >= 0) {
      decks[idx] = deck;
    } else {
      decks.push(deck);
    }

    this.saveDecks(decks);
    const entity: DeckEntity = {
      id: deck.id,
      name: deck.name,
      description: deck.description,
      format: deck.format || 'Standard',
      coverCardPrintId: deck.coverCardId,
      cards: deck.cards.map((c) => ({ cardPrintId: c.cardId, quantity: c.quantity })),
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    };
    DeckRepository.save(entity).catch(() => {});

    try {
      SyncQueue.enqueue({
        entityType: 'deck',
        action: 'UPSERT',
        data: {
          id: deck.id,
          name: deck.name,
          description: deck.description,
          format: deck.format || 'Standard',
          coverCardId: deck.coverCardId,
          cards: deck.cards.map((c) => ({ cardId: c.cardId, quantity: c.quantity })),
        },
      });
      SyncService.flushQueue().catch(() => {});
    } catch {}

    return decks;
  }

  public static deleteDeck(deckId: string): Deck[] {
    const decks = this.getDecks().filter((d) => d.id !== deckId);
    this.saveDecks(decks);
    DeckRepository.delete(deckId).catch(() => {});

    try {
      SyncQueue.enqueue({
        entityType: 'deck',
        action: 'DELETE',
        data: { id: deckId },
      });
      SyncService.flushQueue().catch(() => {});
    } catch {}

    return decks;
  }

  /**
   * Favorites Management
   */
  public static getFavorites(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static toggleFavorite(cardId: string): string[] {
    const favorites = this.getFavorites();
    const idx = favorites.indexOf(cardId);
    const isNowFavorite = idx < 0;

    if (idx >= 0) {
      favorites.splice(idx, 1);
    } else {
      favorites.push(cardId);
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    FavoriteRepository.toggle(cardId).catch(() => {});

    try {
      SyncQueue.enqueue({
        entityType: 'favorite',
        action: isNowFavorite ? 'UPSERT' : 'DELETE',
        data: {
          cardId,
          isFavorite: isNowFavorite,
        },
      });
      SyncService.flushQueue().catch(() => {});
    } catch {}

    return favorites;
  }

  public static isFavorite(cardId: string): boolean {
    return this.getFavorites().includes(cardId);
  }

  /**
   * Settings (kept in localStorage as per prompt spec)
   */
  public static getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: Partial<UserSettings>): UserSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }

  /**
   * CSV Export
   */
  public static exportCollectionCSV(cardMetadataMap?: Record<string, any>): string {
    const items = this.getCollection();
    const headers = ['card_id', 'name', 'set', 'number', 'quantity', 'variant', 'condition', 'language'];
    const rows = items.map((item) => {
      const meta = cardMetadataMap ? cardMetadataMap[item.cardId] : undefined;
      const name = meta ? `"${meta.name.replace(/"/g, '""')}"` : item.cardId;
      const set = meta ? `"${meta.setName.replace(/"/g, '""')}"` : '';
      const number = meta ? `"${meta.localId}"` : '';

      return [item.cardId, name, set, number, item.quantity, item.variant, item.condition, item.language].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * JSON Backup Export
   */
  public static exportFullBackupJSON(): string {
    let purchases = [];
    try {
      const pData = localStorage.getItem('pokebinder_purchases_v1');
      if (pData) purchases = JSON.parse(pData);
    } catch {}

    const backupData = {
      schemaVersion: 3,
      timestamp: new Date().toISOString(),
      collection: this.getCollection(),
      decks: this.getDecks(),
      favorites: this.getFavorites(),
      purchases,
      settings: this.getSettings(),
    };

    return JSON.stringify(backupData, null, 2);
  }

  /**
   * Backup Import
   */
  public static importFullBackupJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.collection)) {
        this.saveCollection(data.collection);
      }
      if (Array.isArray(data.decks)) {
        this.saveDecks(data.decks);
      }
      if (Array.isArray(data.favorites)) {
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(data.favorites));
        const favEntities: FavoriteEntity[] = data.favorites.map((cardId: string) => ({
          id: cardId,
          cardPrintId: cardId,
          createdAt: new Date().toISOString(),
        }));
        FavoriteRepository.bulkSave(favEntities).catch(() => {});
      }
      if (Array.isArray(data.purchases)) {
        try {
          localStorage.setItem('pokebinder_purchases_v1', JSON.stringify(data.purchases));
          import('../database/repositories/PurchaseRepository').then(({ PurchaseRepository }) => {
            PurchaseRepository.bulkSave(data.purchases).catch(() => {});
          });
        } catch {}
      }
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      return true;
    } catch (e) {
      console.error('Import backup error', e);
      return false;
    }
  }

  /**
   * Wishlist Management
   */
  public static getWishlist(): WishlistItem[] {
    try {
      const raw = localStorage.getItem('pokebinder_wishlist_v1');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static addToWishlist(item: Omit<WishlistItem, 'addedAt'> & { addedAt?: string }): boolean {
    const list = this.getWishlist();
    const existing = list.find((w) => w.cardId === item.cardId && w.variant === item.variant);
    if (existing) return false;

    const newItem: WishlistItem = {
      ...item,
      addedAt: item.addedAt || new Date().toISOString(),
    };

    localStorage.setItem('pokebinder_wishlist_v1', JSON.stringify([newItem, ...list]));
    return true;
  }

  public static removeFromWishlist(cardId: string, variant?: CardVariant): void {
    const list = this.getWishlist();
    const updated = list.filter((w) => {
      if (variant) {
        return !(w.cardId === cardId && w.variant === variant);
      }
      return w.cardId !== cardId;
    });
    localStorage.setItem('pokebinder_wishlist_v1', JSON.stringify(updated));
  }

  public static isInWishlist(cardId: string): boolean {
    const list = this.getWishlist();
    return list.some((w) => w.cardId === cardId);
  }

  public static updateWishlistItem(cardId: string, variant: CardVariant, updates: Partial<WishlistItem>): void {
    const list = this.getWishlist();
    const index = list.findIndex((w) => w.cardId === cardId && w.variant === variant);
    if (index >= 0) {
      list[index] = { ...list[index], ...updates };
      localStorage.setItem('pokebinder_wishlist_v1', JSON.stringify(list));
    }
  }
}
