/**
 * Master Synchronization Coordinator
 * Handles:
 * 1. Flushes the local offline SyncQueue to Supabase
 * 2. Pulls remote delta updates and reconciles via SyncConflictResolver
 * 3. Handles automatic retry, exponential backoff, and connection restoration
 */

import { getSupabaseClient, isSupabaseConfigured } from '../supabaseClient';
import { SyncQueue } from './SyncQueue';
import { SyncOperation } from './SyncOperation';
import { SyncConflictResolver } from './SyncConflictResolver';
import { SyncStatusService } from './SyncStatusService';
import { SupabaseCollectionRepository } from '../repositories/SupabaseCollectionRepository';
import { SupabaseDeckRepository } from '../repositories/SupabaseDeckRepository';
import { SupabaseFavoriteRepository } from '../repositories/SupabaseFavoriteRepository';
import { SupabaseWishlistRepository } from '../repositories/SupabaseWishlistRepository';
import { SupabasePriceRepository } from '../repositories/SupabasePriceRepository';
import { SupabaseMarketLinkRepository } from '../repositories/SupabaseMarketLinkRepository';
import { SupabasePurchaseRepository } from '../repositories/SupabasePurchaseRepository';
import { SupabaseTradeRepository } from '../repositories/SupabaseTradeRepository';

import { CollectionRepository } from '../../../database/repositories/CollectionRepository';
import { DeckRepository } from '../../../database/repositories/DeckRepository';
import { FavoriteRepository } from '../../../database/repositories/FavoriteRepository';
import { WishlistRepository } from '../../../database/repositories/WishlistRepository';
import { PurchaseRepository } from '../../../database/repositories/PurchaseRepository';
import { TradeRepository } from '../../../database/repositories/TradeRepository';
import { StorageService } from '../../storage';

export class SyncService {
  private static isFlushing = false;
  private static activeUserId: string | null = null;
  private static syncIntervalTimer: any = null;

  /**
   * Set or unset active authenticated user
   */
  public static setUser(userId: string | null, email?: string | null): void {
    if (userId) {
      this.init(userId);
    } else {
      this.stop();
    }
  }

  /**
   * Initialize sync service for an authenticated user
   */
  public static init(userId?: string): void {
    if (userId) {
      this.activeUserId = userId;
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        SyncStatusService.update({ isOnline: true });
        this.flushQueue();
      });

      window.addEventListener('offline', () => {
        SyncStatusService.update({ isOnline: false });
      });
    }

    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer);
    }

    // Periodic queue flush every 30s
    this.syncIntervalTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && !this.isFlushing && SyncQueue.getPendingCount() > 0) {
        this.flushQueue();
      }
    }, 30000);

    // Initial flush and sync
    if (this.activeUserId) {
      this.flushQueue();
    }
  }

  public static stop(): void {
    if (this.syncIntervalTimer) {
      clearInterval(this.syncIntervalTimer);
      this.syncIntervalTimer = null;
    }
    this.activeUserId = null;
  }

  /**
   * Flushes pending operations in FIFO order
   */
  public static async flushQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isFlushing || !this.activeUserId || !isSupabaseConfigured) {
      return { processed: 0, failed: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      SyncStatusService.update({ isOnline: false, pendingCount: SyncQueue.getPendingCount() });
      return { processed: 0, failed: 0 };
    }

    this.isFlushing = true;
    SyncStatusService.update({ isSyncing: true, pendingCount: SyncQueue.getPendingCount() });

    let processed = 0;
    let failed = 0;

    try {
      const queue = SyncQueue.getQueue();

      for (const op of queue) {
        // Skip operations that exceeded max retries
        if (op.retryCount >= 5) {
          continue;
        }

        try {
          const success = await this.processOperation(op, this.activeUserId);
          if (success) {
            SyncQueue.remove(op.id);
            processed++;
          } else {
            SyncQueue.markFailed(op.id);
            failed++;
          }
        } catch (err: any) {
          console.error(`Failed to process sync op ${op.id}:`, err);
          SyncQueue.markFailed(op.id, err.message);
          failed++;
        }
      }

      SyncStatusService.update({
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        pendingCount: SyncQueue.getPendingCount(),
        errorMessage: null,
      });
    } catch (err: any) {
      console.error('Fatal error during sync flush:', err);
      SyncStatusService.update({
        isSyncing: false,
        errorMessage: err.message || 'Falha ao sincronizar com o servidor',
      });
    } finally {
      this.isFlushing = false;
    }

    return { processed, failed };
  }

  /**
   * Process a single queued operation using atomic repository/RPC calls
   */
  private static async processOperation(op: SyncOperation, userId: string): Promise<boolean> {
    switch (op.entityType) {
      case 'collection': {
        if (op.action === 'INCREMENT') {
          const res = await SupabaseCollectionRepository.atomicIncrement({
            cardId: op.data.cardId,
            delta: op.data.delta,
            variant: op.data.variant,
            condition: op.data.condition,
            language: op.data.language,
            notes: op.data.notes,
          });
          return res !== null;
        } else if (op.action === 'DECREMENT') {
          const res = await SupabaseCollectionRepository.atomicDecrement({
            cardId: op.data.cardId,
            delta: op.data.delta,
            variant: op.data.variant,
            condition: op.data.condition,
            language: op.data.language,
          });
          return res !== null;
        } else if (op.action === 'UPSERT') {
          return SupabaseCollectionRepository.upsert(
            {
              id: op.data.id || `col_${Date.now()}`,
              cardPrintId: op.data.cardId,
              variant: op.data.variant || 'normal',
              condition: op.data.condition || 'near_mint',
              language: op.data.language || 'pt',
              quantity: op.data.quantity || 1,
              notes: op.data.notes,
              createdAt: op.timestamp,
              updatedAt: op.timestamp,
            },
            userId
          );
        } else if (op.action === 'DELETE') {
          return SupabaseCollectionRepository.softDelete(
            op.data.cardId,
            op.data.variant,
            op.data.condition,
            op.data.language
          );
        }
        return false;
      }

      case 'deck': {
        if (op.action === 'UPSERT') {
          return SupabaseDeckRepository.upsertDeck(
            {
              id: op.data.id,
              name: op.data.name,
              description: op.data.description,
              format: op.data.format || 'Standard',
              coverCardPrintId: op.data.coverCardId,
              cards: (op.data.cards || []).map((c: any) => ({
                cardPrintId: c.cardId || c.cardPrintId,
                quantity: c.quantity || 1,
              })),
              createdAt: op.timestamp,
              updatedAt: op.timestamp,
            },
            userId
          );
        } else if (op.action === 'DELETE') {
          return SupabaseDeckRepository.softDelete(op.data.id);
        }
        return false;
      }

      case 'favorite': {
        return SupabaseFavoriteRepository.setFavorite(op.data.cardId, op.data.isFavorite, userId);
      }

      case 'wishlist': {
        if (op.action === 'UPSERT') {
          return SupabaseWishlistRepository.upsert(
            {
              id: op.data.id,
              cardPrintId: op.data.cardId,
              targetPrice: op.data.targetPrice,
              priority: op.data.priority || 'medium',
              desiredQuantity: op.data.quantity || 1,
              notes: op.data.notes,
              createdAt: op.timestamp,
              updatedAt: op.timestamp,
            },
            userId
          );
        } else if (op.action === 'DELETE') {
          return SupabaseWishlistRepository.softDelete(op.data.id);
        }
        return false;
      }

      case 'market_price': {
        return SupabasePriceRepository.upsertPrice(
          {
            cardId: op.data.cardId,
            variant: op.data.variant,
            condition: op.data.condition,
            source: op.data.source,
            amount: op.data.amount,
            currency: op.data.currency,
            origin: op.data.origin || 'manual',
          },
          userId
        );
      }

      case 'market_link': {
        if (op.action === 'UPSERT') {
          return SupabaseMarketLinkRepository.saveLink(
            {
              cardId: op.data.cardId,
              variant: op.data.variant,
              condition: op.data.condition,
              source: op.data.source,
              url: op.data.url,
              createdAt: op.timestamp,
              updatedAt: op.timestamp,
            },
            userId
          );
        } else if (op.action === 'DELETE') {
          return SupabaseMarketLinkRepository.deleteLink(
            op.data.cardId,
            op.data.variant,
            op.data.condition,
            op.data.source
          );
        }
        return false;
      }

      case 'purchase': {
        const qty = op.data.quantity || 1;
        const total = op.data.pricePaid || 0;
        return SupabasePurchaseRepository.addPurchase(
          {
            id: op.data.id,
            cardId: op.data.cardId,
            variant: op.data.variant || 'normal',
            condition: op.data.condition || 'near_mint',
            quantity: qty,
            pricePerCard: total / qty,
            totalPaid: total,
            currency: op.data.currency || 'BRL',
            seller: op.data.vendor,
            notes: op.data.notes,
            purchasedAt: op.data.purchasedAt,
            createdAt: op.timestamp,
          },
          userId
        );
      }

      case 'trade': {
        if (op.action === 'UPSERT') {
          return SupabaseTradeRepository.upsert(
            {
              id: op.data.id,
              cardPrintId: op.data.cardId,
              availableQuantity: op.data.quantity || 1,
              notes: op.data.notes,
              updatedAt: op.timestamp,
            },
            userId
          );
        } else if (op.action === 'DELETE') {
          return SupabaseTradeRepository.softDelete(op.data.id);
        }
        return false;
      }

      default:
        return true;
    }
  }

  /**
   * Two-Way Delta Sync: Flush local queue + Pull remote changes
   */
  public static async syncNow(): Promise<void> {
    if (!this.activeUserId || !isSupabaseConfigured) return;

    SyncStatusService.update({ isSyncing: true, errorMessage: null });

    try {
      // 1. Flush local mutations first
      await this.flushQueue();

      // 2. Pull remote collection items
      const cloudCollection = await SupabaseCollectionRepository.getAll();
      if (cloudCollection.length > 0) {
        for (const remoteItem of cloudCollection) {
          const localItem = await CollectionRepository.findByCardVariantCondition(
            remoteItem.cardPrintId,
            remoteItem.variant,
            remoteItem.condition,
            remoteItem.language
          );
          const resolved = SyncConflictResolver.resolveCollectionItem(localItem, remoteItem);
          if (resolved) {
            if (resolved.deletedAt || resolved.quantity <= 0) {
              if (localItem) await CollectionRepository.delete(localItem.id);
            } else {
              await CollectionRepository.save(resolved);
            }
          }
        }

        // Sync legacy localStorage representation
        const allLocal = await CollectionRepository.getAll();
        StorageService.saveCollection(
          allLocal.map((i) => ({
            id: i.id,
            cardId: i.cardPrintId,
            language: i.language,
            variant: i.variant,
            quantity: i.quantity,
            condition: i.condition,
            notes: i.notes,
            createdAt: i.createdAt,
            updatedAt: i.updatedAt,
          }))
        );
      }

      // 3. Pull remote decks
      const cloudDecks = await SupabaseDeckRepository.getAll();
      for (const cd of cloudDecks) {
        await DeckRepository.save(cd);
      }

      // 4. Pull remote favorites
      const cloudFavs = await SupabaseFavoriteRepository.getAll();
      for (const f of cloudFavs) {
        await FavoriteRepository.add(f.cardPrintId);
      }

      // 5. Pull remote wishlist
      const cloudWish = await SupabaseWishlistRepository.getAll();
      for (const w of cloudWish) {
        await WishlistRepository.save(w);
      }

      // 6. Pull remote purchases
      const cloudPurchases = await SupabasePurchaseRepository.getAll();
      for (const p of cloudPurchases) {
        await PurchaseRepository.addPurchase(p);
      }

      // 7. Pull remote trades
      const cloudTrades = await SupabaseTradeRepository.getAll();
      for (const t of cloudTrades) {
        await TradeRepository.save(t);
      }

      SyncStatusService.update({
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        pendingCount: SyncQueue.getPendingCount(),
        errorMessage: null,
      });
    } catch (err: any) {
      console.error('SyncService.syncNow error:', err);
      SyncStatusService.update({
        isSyncing: false,
        errorMessage: err.message || 'Erro durante a sincronização',
      });
    }
  }
}
