/**
 * SyncService.ts - Orchestrates automatic background sync, offline queue, migration, and realtime updates.
 */

import { AuthService, UserProfile } from './AuthService';
import { SyncQueue } from './SyncQueue';
import { CloudRepository, CloudUserData } from './CloudRepository';
import { CollectionRepository } from '../../database/repositories/CollectionRepository';
import { DeckRepository } from '../../database/repositories/DeckRepository';
import { FavoriteRepository } from '../../database/repositories/FavoriteRepository';
import { WishlistRepository } from '../../database/repositories/WishlistRepository';
import { PurchaseRepository } from '../../database/repositories/PurchaseRepository';

export type SyncStateStatus = 'SYNCED' | 'PENDING' | 'SYNCING' | 'OFFLINE' | 'ERROR';

export interface SyncStatusInfo {
  status: SyncStateStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage?: string;
}

const LAST_SYNC_KEY = (userId: string) => `pokebinder_last_sync_time_${userId}`;

export class SyncService {
  private static listeners: ((status: SyncStatusInfo) => void)[] = [];
  private static isSyncing = false;

  public static subscribe(listener: (status: SyncStatusInfo) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(status: SyncStatusInfo): void {
    this.listeners.forEach(l => l(status));
  }

  public static getStatus(): SyncStatusInfo {
    const user = AuthService.getCurrentUser();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const pendingCount = user ? SyncQueue.getPendingCount(user.userId) : 0;
    const lastSyncedAt = user ? localStorage.getItem(LAST_SYNC_KEY(user.userId)) : null;

    let status: SyncStateStatus = 'SYNCED';
    if (!isOnline) {
      status = 'OFFLINE';
    } else if (pendingCount > 0) {
      status = 'PENDING';
    } else if (this.isSyncing) {
      status = 'SYNCING';
    }

    return {
      status,
      pendingCount,
      lastSyncedAt,
    };
  }

  /**
   * Synchronize local repositories with Cloud DB
   */
  public static async syncNow(): Promise<boolean> {
    const user = AuthService.getCurrentUser();
    if (!user) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify(this.getStatus());
      return false;
    }

    if (this.isSyncing) return false;
    this.isSyncing = true;
    this.notify(this.getStatus());

    try {
      // 1. Pull latest cloud data and merge into local DB if present
      const cloudData = await CloudRepository.pullData(user.userId);
      if (cloudData) {
        if (cloudData.collectionItems && cloudData.collectionItems.length > 0) {
          await CollectionRepository.bulkSave(cloudData.collectionItems);
        }
        if (cloudData.decks && cloudData.decks.length > 0) {
          for (const deck of cloudData.decks) {
            await DeckRepository.save(deck);
          }
        }
        if (cloudData.favorites && cloudData.favorites.length > 0) {
          const formattedFavs = cloudData.favorites.map((fav: any) => 
            typeof fav === 'string' ? { id: fav, cardPrintId: fav, createdAt: new Date().toISOString() } : fav
          );
          await FavoriteRepository.bulkSave(formattedFavs);
        }
        if (cloudData.wishlist && cloudData.wishlist.length > 0) {
          for (const wish of cloudData.wishlist) {
            await WishlistRepository.save(wish);
          }
        }
        if (cloudData.purchases && cloudData.purchases.length > 0) {
          await PurchaseRepository.bulkSave(cloudData.purchases);
        }
      }

      // 2. Gather local data snapshot
      const collectionItems = await CollectionRepository.getAll();
      const decks = await DeckRepository.getAll();
      const favorites = await FavoriteRepository.getAll();
      const wishlist = await WishlistRepository.getAll();
      const purchases = await PurchaseRepository.getAll();

      // Simple merge / push local to cloud
      const pushSuccess = await CloudRepository.pushSnapshot(user.userId, {
        collectionItems,
        decks,
        favorites,
        wishlist,
        purchases,
        marketLinks: [],
        marketPrices: [],
      });

      if (pushSuccess) {
        SyncQueue.clearCompleted(user.userId);
        const now = new Date().toISOString();
        localStorage.setItem(LAST_SYNC_KEY(user.userId), now);
        this.isSyncing = false;
        this.notify(this.getStatus());
        return true;
      } else {
        throw new Error('Falha ao enviar dados para a nuvem.');
      }
    } catch (e: any) {
      this.isSyncing = false;
      this.notify({
        ...this.getStatus(),
        status: 'ERROR',
        errorMessage: e?.message || 'Erro de sincronização',
      });
      return false;
    }
  }

  /**
   * Migrate existing local guest data to authenticated user account upon login
   */
  public static async migrateLocalDataToCloud(user: UserProfile): Promise<void> {
    try {
      const collectionItems = await CollectionRepository.getAll();
      const decks = await DeckRepository.getAll();
      const favorites = await FavoriteRepository.getAll();
      const wishlist = await WishlistRepository.getAll();
      const purchases = await PurchaseRepository.getAll();

      await CloudRepository.pushSnapshot(user.userId, {
        collectionItems,
        decks,
        favorites,
        wishlist,
        purchases,
        marketLinks: [],
        marketPrices: [],
      });

      localStorage.setItem(LAST_SYNC_KEY(user.userId), new Date().toISOString());
    } catch (e) {
      console.error('Migration error:', e);
    }
  }
}
