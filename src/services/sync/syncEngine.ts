import { db } from '../../database/database';
import { CollectionRepository } from '../../database/repositories/CollectionRepository';
import { DeckRepository } from '../../database/repositories/DeckRepository';
import { FavoriteRepository } from '../../database/repositories/FavoriteRepository';
import { WishlistRepository } from '../../database/repositories/WishlistRepository';
import { TradeRepository } from '../../database/repositories/TradeRepository';
import { SetSyncService } from '../setSyncService';

export interface EntitySyncStatus {
  entityName: string;
  status: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string;
  pendingCount: number;
  errorMessage?: string;
}

export interface SystemHealthCheckResult {
  indexedDBAvailable: boolean;
  localStorageAvailable: boolean;
  isOnline: boolean;
  tableCounts: Record<string, number>;
  catalogHealthStatus: 'healthy' | 'degraded' | 'error';
  lastSyncTimestamp: string;
}

export class SyncEngine {
  private static isSyncing = false;
  private static syncStatuses: Record<string, EntitySyncStatus> = {
    collection: { entityName: 'collection', status: 'idle', pendingCount: 0 },
    decks: { entityName: 'decks', status: 'idle', pendingCount: 0 },
    favorites: { entityName: 'favorites', status: 'idle', pendingCount: 0 },
    wishlist: { entityName: 'wishlist', status: 'idle', pendingCount: 0 },
    tradeItems: { entityName: 'tradeItems', status: 'idle', pendingCount: 0 },
    catalog: { entityName: 'catalog', status: 'idle', pendingCount: 0 },
  };

  /**
   * Acquire sync lock to prevent race conditions
   */
  public static acquireLock(): boolean {
    if (this.isSyncing) return false;
    this.isSyncing = true;
    return true;
  }

  /**
   * Release sync lock
   */
  public static releaseLock(): void {
    this.isSyncing = false;
  }

  /**
   * Get sync statuses for all system entities
   */
  public static getSyncStatuses(): Record<string, EntitySyncStatus> {
    return { ...this.syncStatuses };
  }

  /**
   * Trigger full system synchronization with lock
   */
  public static async syncAll(lang = 'pt'): Promise<boolean> {
    if (!this.acquireLock()) {
      console.warn('SyncEngine: Sync already in progress, skipping request.');
      return false;
    }

    try {
      this.syncStatuses.catalog.status = 'syncing';
      await SetSyncService.quickSync(lang as any);
      this.syncStatuses.catalog.status = 'synced';
      this.syncStatuses.catalog.lastSyncedAt = new Date().toISOString();

      // Update sync statuses
      const collectionItems = await CollectionRepository.getAll();
      this.syncStatuses.collection = {
        entityName: 'collection',
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        pendingCount: collectionItems.length,
      };

      const decks = await DeckRepository.getAll();
      this.syncStatuses.decks = {
        entityName: 'decks',
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        pendingCount: decks.length,
      };

      return true;
    } catch (err: any) {
      console.error('SyncEngine.syncAll error', err);
      this.syncStatuses.catalog.status = 'error';
      this.syncStatuses.catalog.errorMessage = err?.message || 'Unknown sync error';
      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Perform comprehensive health check of IndexedDB, storage, and API
   */
  public static async performSystemHealthCheck(): Promise<SystemHealthCheckResult> {
    let indexedDBAvailable = false;
    let localStorageAvailable = false;
    const tableCounts: Record<string, number> = {};

    // Test IndexedDB
    try {
      tableCounts['cards'] = await db.cards.count();
      tableCounts['cardPrints'] = await db.cardPrints.count();
      tableCounts['sets'] = await db.sets.count();
      tableCounts['collectionItems'] = await db.collectionItems.count();
      tableCounts['decks'] = await db.decks.count();
      tableCounts['favorites'] = await db.favorites.count();
      tableCounts['wishlist'] = await db.wishlist.count();
      tableCounts['tradeItems'] = await db.tradeItems.count();
      tableCounts['prices'] = await db.prices.count();
      tableCounts['catalogVersions'] = await db.catalogVersions.count();
      indexedDBAvailable = true;
    } catch (e) {
      console.error('SystemHealthCheck IndexedDB failure:', e);
    }

    // Test LocalStorage
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('__health_test__', 'ok');
        localStorage.removeItem('__health_test__');
        localStorageAvailable = true;
      }
    } catch {}

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    return {
      indexedDBAvailable,
      localStorageAvailable,
      isOnline,
      tableCounts,
      catalogHealthStatus: indexedDBAvailable ? 'healthy' : 'degraded',
      lastSyncTimestamp: SetSyncService.getLastSyncTimestamp(),
    };
  }
}
