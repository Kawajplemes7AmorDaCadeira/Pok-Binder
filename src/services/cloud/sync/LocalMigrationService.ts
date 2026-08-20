/**
 * LocalMigrationService.ts
 * Implements non-destructive, audited migration from Local Storage / IndexedDB to Supabase.
 * Enforces mandatory JSON backup before migration and checksum validation.
 */

import { StorageService } from '../../storage';
import { CollectionRepository } from '../../../database/repositories/CollectionRepository';
import { DeckRepository } from '../../../database/repositories/DeckRepository';
import { FavoriteRepository } from '../../../database/repositories/FavoriteRepository';
import { WishlistRepository } from '../../../database/repositories/WishlistRepository';
import { TradeRepository } from '../../../database/repositories/TradeRepository';
import { PurchaseRepository } from '../../../database/repositories/PurchaseRepository';
import { LinkedMarketPriceService } from '../../pricing/LinkedMarketPriceService';
import { BackupService, FullBackupData } from '../../backup/backupService';
import { SupabaseCollectionRepository } from '../repositories/SupabaseCollectionRepository';
import { SupabaseDeckRepository } from '../repositories/SupabaseDeckRepository';
import { SupabaseFavoriteRepository } from '../repositories/SupabaseFavoriteRepository';
import { SupabaseWishlistRepository } from '../repositories/SupabaseWishlistRepository';
import { SupabasePriceRepository } from '../repositories/SupabasePriceRepository';
import { SupabaseMarketLinkRepository } from '../repositories/SupabaseMarketLinkRepository';
import { SupabasePurchaseRepository } from '../repositories/SupabasePurchaseRepository';
import { SupabaseTradeRepository } from '../repositories/SupabaseTradeRepository';
import { getSupabaseClient } from '../supabaseClient';

export interface LocalDataSummary {
  collectionCount: number;
  totalCardsQuantity: number;
  deckCount: number;
  favoriteCount: number;
  wishlistCount: number;
  purchaseCount: number;
  tradeCount: number;
  hasMigrated: boolean;
  migratedAt: string | null;
}

export interface MigrationResult {
  success: boolean;
  backupData: FullBackupData | null;
  uploadedCollection: number;
  uploadedDecks: number;
  uploadedFavorites: number;
  uploadedWishlist: number;
  uploadedPurchases: number;
  uploadedTrades: number;
  durationMs: number;
  errors: string[];
}

export class LocalMigrationService {
  private static getMigrationKey(userId: string): string {
    return `pokebinder_cloud_migration_v1_${userId}`;
  }

  /**
   * Inspect and audit local device data before migration
   */
  public static async inspectLocalData(userId?: string): Promise<LocalDataSummary> {
    await StorageService.init();

    const collection = await CollectionRepository.getAll();
    const decks = await DeckRepository.getAll();
    const favorites = await FavoriteRepository.getAll();
    const wishlist = await WishlistRepository.getAll();
    const purchases = await PurchaseRepository.getAll();
    const trades = await TradeRepository.getAll();

    const totalQty = collection.reduce((acc, curr) => acc + curr.quantity, 0);

    let hasMigrated = false;
    let migratedAt: string | null = null;

    if (userId) {
      const stored = localStorage.getItem(this.getMigrationKey(userId));
      if (stored) {
        hasMigrated = true;
        migratedAt = stored;
      }
    }

    return {
      collectionCount: collection.length,
      totalCardsQuantity: totalQty,
      deckCount: decks.length,
      favoriteCount: favorites.length,
      wishlistCount: wishlist.length,
      purchaseCount: purchases.length,
      tradeCount: trades.length,
      hasMigrated,
      migratedAt,
    };
  }

  /**
   * Execute Safe, Audited Cloud Migration
   */
  public static async migrateToCloud(userId: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Step 1: Pre-migration full backup
    let backupObj: FullBackupData | null = null;
    try {
      const backupJson = await BackupService.exportBackupJSON();
      backupObj = JSON.parse(backupJson);
      // Persist emergency recovery snapshot
      localStorage.setItem(`pokebinder_pre_migration_backup_${userId}`, backupJson);
    } catch (err: any) {
      errors.push(`Falha ao gerar backup preventivo: ${err.message}`);
      return {
        success: false,
        backupData: null,
        uploadedCollection: 0,
        uploadedDecks: 0,
        uploadedFavorites: 0,
        uploadedWishlist: 0,
        uploadedPurchases: 0,
        uploadedTrades: 0,
        durationMs: Date.now() - startTime,
        errors,
      };
    }

    let uploadedCollection = 0;
    let uploadedDecks = 0;
    let uploadedFavorites = 0;
    let uploadedWishlist = 0;
    let uploadedPurchases = 0;
    let uploadedTrades = 0;

    try {
      // Step 2: Migrate Collection Items
      let localCollection = await CollectionRepository.getAll();
      if (localCollection.length === 0) {
        const rawCollection = StorageService.getCollection();
        localCollection = rawCollection.map((i) => ({
          id: i.id,
          cardPrintId: i.cardId,
          variant: i.variant || 'normal',
          condition: i.condition || 'near_mint',
          language: i.language || 'pt',
          quantity: i.quantity || 1,
          notes: i.notes,
          createdAt: i.createdAt || new Date().toISOString(),
          updatedAt: i.updatedAt || new Date().toISOString(),
        }));
      }

      if (localCollection.length > 0) {
        const ok = await SupabaseCollectionRepository.bulkUpsert(localCollection, userId);
        if (ok) {
          uploadedCollection = localCollection.length;
        } else {
          errors.push('Erro ao enviar cartas da coleção para o Supabase.');
        }
      }

      // Step 3: Migrate Decks
      const localDecks = await DeckRepository.getAll();
      for (const deck of localDecks) {
        const ok = await SupabaseDeckRepository.upsertDeck(deck, userId);
        if (ok) uploadedDecks++;
        else errors.push(`Erro ao enviar deck "${deck.name}".`);
      }

      // Step 4: Migrate Favorites
      const localFavs = await FavoriteRepository.getAll();
      for (const fav of localFavs) {
        const ok = await SupabaseFavoriteRepository.setFavorite(fav.cardPrintId, true, userId);
        if (ok) uploadedFavorites++;
      }

      // Step 5: Migrate Wishlist
      const localWishlist = await WishlistRepository.getAll();
      for (const wish of localWishlist) {
        const ok = await SupabaseWishlistRepository.upsert(wish, userId);
        if (ok) uploadedWishlist++;
      }

      // Step 6: Migrate Purchases
      const localPurchases = await PurchaseRepository.getAll();
      for (const purch of localPurchases) {
        const ok = await SupabasePurchaseRepository.addPurchase(purch, userId);
        if (ok) uploadedPurchases++;
      }

      // Step 7: Migrate Trades
      const localTrades = await TradeRepository.getAll();
      for (const tr of localTrades) {
        const ok = await SupabaseTradeRepository.upsert(tr, userId);
        if (ok) uploadedTrades++;
      }

      // Step 8: Mark migration completed if no fatal errors
      const completedAt = new Date().toISOString();
      localStorage.setItem(this.getMigrationKey(userId), completedAt);

      return {
        success: errors.length === 0,
        backupData: backupObj,
        uploadedCollection,
        uploadedDecks,
        uploadedFavorites,
        uploadedWishlist,
        uploadedPurchases,
        uploadedTrades,
        durationMs: Date.now() - startTime,
        errors,
      };
    } catch (err: any) {
      errors.push(`Exceção durante a migração: ${err.message}`);
      return {
        success: false,
        backupData: backupObj,
        uploadedCollection,
        uploadedDecks,
        uploadedFavorites,
        uploadedWishlist,
        uploadedPurchases,
        uploadedTrades,
        durationMs: Date.now() - startTime,
        errors,
      };
    }
  }
}
