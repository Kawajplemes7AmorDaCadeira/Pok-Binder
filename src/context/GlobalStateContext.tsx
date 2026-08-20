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
      // Wait for StorageService init
      await StorageService.init();

      // Read from localStorage defaults or async fallback to Dexie repos
      const localColl = StorageService.getCollection();
      setCollection(localColl);

      const localDecks = StorageService.getDecks();
      setDecks(localDecks);

      const localFavs = StorageService.getFavorites();
      setFavorites(localFavs);

      // Async fetch of database tables for wishlist & trade item state
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
  };

  const setPreferredLanguage = (lang: CardLanguage) => {
    setPreferredLanguageState(lang);
    StorageService.saveSettings({ theme, preferredLanguage: lang });
  };

  // 3. Collection Updates
  const updateCardQuantity = async (
    cardId: string,
    delta: number,
    variant: CardVariant = 'normal',
    language: CardLanguage = 'pt',
    condition: CardCondition = 'near_mint'
  ) => {
    const updatedCollection = StorageService.updateCardQuantity(cardId, delta, variant, language, condition);
    setCollection(updatedCollection);
  };

  const toggleFavorite = async (cardId: string) => {
    const updatedFavs = StorageService.toggleFavorite(cardId);
    setFavorites(updatedFavs);
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
  };

  const deleteDeck = async (deckId: string) => {
    const updatedDecks = StorageService.deleteDeck(deckId);
    setDecks(updatedDecks);
  };

  // 5. Wishlist Actions
  const saveWishlistItem = async (
    cardId: string,
    quantity: number,
    priority: 'low' | 'medium' | 'high' = 'medium',
    notes = ''
  ) => {
    await WishlistRepository.save({
      cardPrintId: cardId,
      desiredQuantity: quantity,
      priority,
      notes,
    });
    const wishs = await WishlistRepository.getAll();
    setWishlist(wishs);
  };

  const removeWishlistItem = async (id: string) => {
    await db.wishlist.delete(id);
    const wishs = await WishlistRepository.getAll();
    setWishlist(wishs);
  };

  // 6. Trade Binder Actions
  const saveTradeItem = async (
    cardId: string,
    quantity: number,
    variant: CardVariant = 'normal',
    condition: CardCondition = 'near_mint',
    price?: number
  ) => {
    await TradeRepository.save({
      cardPrintId: cardId,
      availableQuantity: quantity,
      notes: `Variant: ${variant}, Condition: ${condition}, Price: ${price || 'N/A'}`,
    });
    const trades = await TradeRepository.getAll();
    setTradeBinder(trades);
  };

  const removeTradeItem = async (id: string) => {
    await db.tradeItems.delete(id);
    const trades = await TradeRepository.getAll();
    setTradeBinder(trades);
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
      // Execute as atomic Dexie transaction to prevent partial state corruption
      await db.transaction('rw', [
        db.collectionItems,
        db.decks,
        db.favorites,
        db.wishlist,
        db.tradeItems
      ], async () => {
        // Clear all existing
        await db.collectionItems.clear();
        await db.decks.clear();
        await db.favorites.clear();
        await db.wishlist.clear();
        await db.tradeItems.clear();

        // Bulk insert entities
        if (backupData.collection?.length) {
          const entities = backupData.collection.map((i: any) => ({
            id: i.id || `col_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
            id: w.id || `wish_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
            id: t.id || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            cardPrintId: t.cardPrintId || t.cardId,
            availableQuantity: t.availableQuantity || t.quantity || 1,
            notes: t.notes || `Variant: ${t.variant || 'normal'}, Condition: ${t.condition || 'near_mint'}${t.price ? `, Price: ${t.price}` : ''}`,
            updatedAt: t.updatedAt || new Date().toISOString(),
          }));
          await db.tradeItems.bulkAdd(entities);
        }
      });

      // Synchronize to LocalStorage for fallback
      StorageService.saveCollection(backupData.collection || []);
      StorageService.saveDecks(backupData.decks || []);
      localStorage.setItem(Storage_Keys_Fallback.FAVORITES, JSON.stringify(backupData.favorites || []));

      // Trigger hot state update across the react app
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
        importBackupSafe,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};

// Fallback keys helper inside Context
const Storage_Keys_Fallback = {
  FAVORITES: 'pokebinder_favorites',
};
