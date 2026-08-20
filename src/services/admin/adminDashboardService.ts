import { db } from '../../database/database';
import { SyncEngine, SystemHealthCheckResult } from '../sync/syncEngine';
import { SetSyncService } from '../setSyncService';

export interface AdminDashboardOverview {
  healthCheck: SystemHealthCheckResult;
  entityCounts: {
    totalIndexedCards: number;
    totalIndexedSets: number;
    userCollectionItems: number;
    userDecks: number;
    userFavorites: number;
    userWishlist: number;
    userTradeItems: number;
    priceSnapshots: number;
  };
  storageStatus: {
    syncEngineStatus: Record<string, any>;
    lastSyncTimestamp: string;
  };
}

export class AdminDashboardService {
  /**
   * Fetch complete administrative summary for Admin Panel
   */
  public static async getAdminOverview(): Promise<AdminDashboardOverview> {
    const healthCheck = await SyncEngine.performSystemHealthCheck();

    const entityCounts = {
      totalIndexedCards: healthCheck.tableCounts['cardPrints'] || 0,
      totalIndexedSets: healthCheck.tableCounts['sets'] || 0,
      userCollectionItems: healthCheck.tableCounts['collectionItems'] || 0,
      userDecks: healthCheck.tableCounts['decks'] || 0,
      userFavorites: healthCheck.tableCounts['favorites'] || 0,
      userWishlist: healthCheck.tableCounts['wishlist'] || 0,
      userTradeItems: healthCheck.tableCounts['tradeItems'] || 0,
      priceSnapshots: healthCheck.tableCounts['prices'] || 0,
    };

    return {
      healthCheck,
      entityCounts,
      storageStatus: {
        syncEngineStatus: SyncEngine.getSyncStatuses(),
        lastSyncTimestamp: SetSyncService.getLastSyncTimestamp(),
      },
    };
  }
}
