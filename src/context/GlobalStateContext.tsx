import React, { createContext, useContext, useState, useEffect } from 'react';
import { CardLanguage, CardVariant, CardCondition, CollectionItem, Deck, PokemonCard } from '../types';
import { StorageService } from '../services/storage';
import { CollectionRepository } from '../database/repositories/CollectionRepository';
import { DeckRepository } from '../database/repositories/DeckRepository';
import { FavoriteRepository } from '../database/repositories/FavoriteRepository';
import { WishlistRepository } from '../database/repositories/WishlistRepository';
import { TradeRepository } from '../database/repositories/TradeRepository';
import { db } from '../database/database';
import { WishlistItemEntity, TradeItemEntity } from '../types/db';
import { SyncQueue } from '../services/cloud/sync/SyncQueue';
import { SyncService } from '../services/cloud/sync/SyncService';
import { RealtimeSyncService } from '../services/cloud/sync/RealtimeSyncService';

interface GlobalStateContextType {
  collection: CollectionItem[];
  decks: Deck[];
  favorites: string[];
  wishlist: WishlistItemEntity[];
  tradeBinder: TradeItemEntity[];
  loading: boolean;
  theme: 'light' | 'dark';
  preferredLanguage: CardLanguage;
  
  // Setters/Mutations
  setTheme: (t: 'light' | 'dark') => void;
  setPreferredLanguage: (lang: CardLanguage) => void;
  updateCardQuantity: (
    cardId: string,
    delta: number,
    variant?: CardVariant,
    language?: CardLanguage,
    condition?: CardCondition
  ) => Promise<void>;
  toggleFavorite: (cardId: string) => Promise<void>;
  saveDeck: (deck: Deck) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  clearCollection: () => Promise<void>;
  removeSampleCards: () => Promise<void>;
  
  // Wishlist & Trade Binder actions
  saveWishlistItem: (cardId: string, quantity: number, priority?: 'low' | 'medium' | 'high', notes?: string) => Promise<void>;
  removeWishlistItem: (id: string) => Promise<void>;
  saveTradeItem: (cardId: string, quantity: number, variant?: CardVariant, condition?: CardCondition, price?: number) => Promise<void>;
  removeTradeItem: (id: string) => Promise<void>;
  
  // Refresh helper
  refreshData: () => Promise<void>;

  // Bulk Transaction
  importBackupSafe: (backupData: {
    collection: any[];
    decks: any[];
    favorites: string[];
    wishlist?: any[];
    tradeItems?: any[];
  }) => Promise<boolean>;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};

export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItemEntity[]>([]);
  const [tradeBinder, setTradeBinder] = useState<TradeItemEntity[]>([]);
  const [loading, setLoading] = useState(true);

  const settings = StorageService.getSettings();
  const [theme, setThemeState] = useState<'light' | 'dark'>(settings.theme || 'dark');
  const [preferredLanguage, setPreferredLanguageState] = useState<CardLanguage>(
    settings.preferredLanguage || 'pt'
  );

  // 1. Initial Load of all stores
  const loadAllData = async () => {
    try {
      setLoading(true);
      await StorageService.init();

      const localColl = StorageService.getCollection();
      setCollection(localColl);

      const localDecks = StorageService.getDecks();
      setDecks(localDecks);

      const localFavs = StorageService.getFavorites();
      setFavorites(localFavs);

      const wishs = await WishlistRepository.getAll();
      setWishlist(wishs);

      const trades = await TradeRepository.getAll();
      setTradeBinder(trades);
    } catch (err) {
      console.error('Failed to load global state data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Listen for Realtime cloud updates from other devices (e.g. mobile scan arriving on PC)
    const unsub = RealtimeSyncService.addListener(() => {
      loadAllData();
    });

    return () => {
      unsub();
    };
  }, []);

  // 2. Settings Synchronizers
  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
    StorageService.saveSettings({ theme: t, preferredLanguage });
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    SyncQueue.enqueue({
      entityType: 'user_settings',
      action: 'UPSERT',
      data: { theme: t, preferredLanguage },
    });
    SyncService.flushQueue().catch(() => {});
  };

  const setPreferredLanguage = (lang: CardLanguage) => {
    setPreferredLanguageState(lang);
    StorageService.saveSettings({ theme, preferredLanguage: lang });
    SyncQueue.enqueue({
      entityType: 'user_settings',
      action: 'UPSERT',
      data: { theme, preferredLanguage: lang },
    });
    SyncService.flushQueue().catch(() => {});
  };

  // 3. Collection Updates with Optimistic Local-First + SyncQueue + Atomic Server RPC
  const updateCardQuantity = async (
    cardId: string,
    delta: number,
    variant: CardVariant = 'normal',
    language: CardLanguage = 'pt',
    condition: CardCondition = 'near_mint'
  ) => {
    // 1. Optimistic Local Write
    const updatedCollection = StorageService.updateCardQuantity(cardId, delta, variant, language, condition);
    setCollection(updatedCollection);

    // 2. Enqueue Atomic Sync Operation
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

    // 3. Trigger async cloud flush
    SyncService.flushQueue().catch(() => {});
  };

  const toggleFavorite = async (cardId: string) => {
    const updatedFavs = StorageService.toggleFavorite(cardId);
    setFavorites(updatedFavs);

    const isFav = updatedFavs.includes(cardId);
    SyncQueue.enqueue({
      entityType: 'favorite',
      action: isFav ? 'UPSERT' : 'DELETE',
      data: { cardId, isFavorite: isFav },
    });
    SyncService.flushQueue().catch(() => {});
  };

  const clearCollection = async () => {
    StorageService.clearCollection();
    setCollection([]);
  };

  const removeSampleCards = async () => {
    const filtered = StorageService.removeSampleCards();
    setCollection(filtered);
  };

  // 4. Decks Updates
  const saveDeck = async (deck: Deck) => {
    const updatedDecks = StorageService.saveDeck(deck);
    setDecks(updatedDecks);

    SyncQueue.enqueue({
      entityType: 'deck',
      action: 'UPSERT',
      data: {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        format: deck.format,
        coverCardId: deck.coverCardId,
        cards: deck.cards.map((c) => ({ cardId: c.cardId, quantity: c.quantity })),
      },
    });
    SyncService.flushQueue().catch(() => {});
  };

  const deleteDeck = async (deckId: string) => {
    const updatedDecks = StorageService.deleteDeck(deckId);
    setDecks(updatedDecks);

    SyncQueue.enqueue({
      entityType: 'deck',
      action: 'DELETE',
      data: { id: deckId },
    });
    SyncService.flushQueue().catch(() => {});
  };

  // 5. Wishlist Actions
  const saveWishlistItem = async (
    cardId: string,
    quantity: number,
    priority: 'low' | 'medium' | 'high' = 'medium',
    notes = ''
  ) => {
    const saved = await WishlistRepository.save({
      cardPrintId: cardId,
      desiredQuantity: quantity,
      priority,
      notes,
    });
    const wishs = await WishlistRepository.getAll();
    setWishlist(wishs);

    SyncQueue.enqueue({
      entityType: 'wishlist',
      action: 'UPSERT',
      data: {
        id: saved.id,
        cardId,
        variant: 'normal',
        priority,
        quantity,
        notes,
      },
    });
    SyncService.flushQueue().catch(() => {});
  };

  const removeWishlistItem = async (id: string) => {
    await db.wishlist.delete(id);
    const wishs = await WishlistRepository.getAll();
    setWishlist(wishs);

    SyncQueue.enqueue({
      entityType: 'wishlist',
      action: 'DELETE',
      data: { id },
    });
    SyncService.flushQueue().catch(() => {});
  };

  // 6. Trade Binder Actions
  const saveTradeItem = async (
    cardId: string,
    quantity: number,
    variant: CardVariant = 'normal',
    condition: CardCondition = 'near_mint',
    price?: number
  ) => {
    const saved = await TradeRepository.save({
      cardPrintId: cardId,
      availableQuantity: quantity,
      notes: `Variant: ${variant}, Condition: ${condition}, Price: ${price || 'N/A'}`,
    });
    const trades = await TradeRepository.getAll();
    setTradeBinder(trades);

    SyncQueue.enqueue({
      entityType: 'trade',
      action: 'UPSERT',
      data: {
        id: saved.id,
        cardId,
        variant,
        condition,
        quantity,
        price,
      },
    });
    SyncService.flushQueue().catch(() => {});
  };

  const removeTradeItem = async (id: string) => {
    await db.tradeItems.delete(id);
    const trades = await TradeRepository.getAll();
    setTradeBinder(trades);

    SyncQueue.enqueue({
      entityType: 'trade',
      action: 'DELETE',
      data: { id },
    });
    SyncService.flushQueue().catch(() => {});
  };

  // 7. Bulk Transaction safety for complete imports
  const importBackupSafe = async (backupData: {
    collection: any[];
    decks: any[];
    favorites: string[];
    wishlist?: any[];
    tradeItems?: any[];
  }): Promise<boolean> => {
    try {
      await db.transaction('rw', [
        db.collectionItems,
        db.decks,
        db.favorites,
        db.wishlist,
        db.tradeItems
      ], async () => {
        await db.collectionItems.clear();
        await db.decks.clear();
        await db.favorites.clear();
        await db.wishlist.clear();
        await db.tradeItems.clear();

        if (backupData.collection?.length) {
          const entities = backupData.collection.map((i: any) => ({
            id: i.id || `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            cardPrintId: i.cardId,
            quantity: i.quantity,
            variant: i.variant || 'normal',
            language: i.language || 'pt',
            condition: i.condition || 'near_mint',
            notes: i.notes,
            createdAt: i.createdAt || new Date().toISOString(),
            updatedAt: i.updatedAt || new Date().toISOString(),
          }));
          await db.collectionItems.bulkAdd(entities);
        }

        if (backupData.decks?.length) {
          const entities = backupData.decks.map((d: any) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            format: d.format || 'Standard',
            coverCardPrintId: d.coverCardId,
            cards: d.cards.map((c: any) => ({ cardPrintId: c.cardId, quantity: c.quantity })),
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          }));
          await db.decks.bulkAdd(entities);
        }

        if (backupData.favorites?.length) {
          const entities = backupData.favorites.map((cardId) => ({
            id: `fav_${cardId}`,
            cardPrintId: cardId,
            createdAt: new Date().toISOString(),
          }));
          await db.favorites.bulkAdd(entities);
        }

        if (backupData.wishlist?.length) {
          const entities = backupData.wishlist.map((w: any) => ({
            id: w.id || `wish_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            cardPrintId: w.cardPrintId || w.cardId,
            priority: w.priority || 'medium',
            desiredQuantity: w.desiredQuantity || w.quantity || 1,
            notes: w.notes,
            createdAt: w.createdAt || new Date().toISOString(),
            updatedAt: w.updatedAt || new Date().toISOString(),
          }));
          await db.wishlist.bulkAdd(entities);
        }

        if (backupData.tradeItems?.length) {
          const entities: TradeItemEntity[] = backupData.tradeItems.map((t: any) => ({
            id: t.id || `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            cardPrintId: t.cardPrintId || t.cardId,
            availableQuantity: t.availableQuantity || t.quantity || 1,
            notes: t.notes || `Variant: ${t.variant || 'normal'}, Condition: ${t.condition || 'near_mint'}${t.price ? `, Price: ${t.price}` : ''}`,
            updatedAt: t.updatedAt || new Date().toISOString(),
          }));
          await db.tradeItems.bulkAdd(entities);
        }
      });

      StorageService.saveCollection(backupData.collection || []);
      StorageService.saveDecks(backupData.decks || []);
      localStorage.setItem('pokebinder_favorites', JSON.stringify(backupData.favorites || []));

      await loadAllData();
      return true;
    } catch (err) {
      console.error('Backup import transaction failed', err);
      return false;
    }
  };

  return (
    <GlobalStateContext.Provider
      value={{
        collection,
        decks,
        favorites,
        wishlist,
        tradeBinder,
        loading,
        theme,
        preferredLanguage,
        setTheme,
        setPreferredLanguage,
        updateCardQuantity,
        toggleFavorite,
        saveDeck,
        deleteDeck,
        clearCollection,
        removeSampleCards,
        saveWishlistItem,
        removeWishlistItem,
        saveTradeItem,
        removeTradeItem,
        refreshData: loadAllData,
        importBackupSafe,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};
