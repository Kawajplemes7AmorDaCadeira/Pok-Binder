/**
 * CloudRepository.ts - Persistent cloud storage adapter scoped per userId using IndexedDB (cloudStore)
 * to prevent localStorage quota exceeded errors.
 */

import { db } from '../../database/database';

export interface CloudUserData {
  collectionItems: any[];
  decks: any[];
  favorites: any[];
  wishlist: any[];
  purchases: any[];
  marketLinks: any[];
  marketPrices: any[];
  updatedAt: string;
}

export class CloudRepository {
  public static async getUserCloudData(userId: string): Promise<CloudUserData> {
    try {
      const record = await db.cloudStore.get(userId);
      if (!record || !record.data) {
        return {
          collectionItems: [],
          decks: [],
          favorites: [],
          wishlist: [],
          purchases: [],
          marketLinks: [],
          marketPrices: [],
          updatedAt: new Date().toISOString(),
        };
      }
      return record.data;
    } catch {
      return {
        collectionItems: [],
        decks: [],
        favorites: [],
        wishlist: [],
        purchases: [],
        marketLinks: [],
        marketPrices: [],
        updatedAt: new Date().toISOString(),
      };
    }
  }

  public static async saveUserCloudData(userId: string, data: Partial<CloudUserData>): Promise<CloudUserData> {
    const current = await this.getUserCloudData(userId);
    const updated: CloudUserData = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await db.cloudStore.put({
      userId,
      data: updated,
      updatedAt: updated.updatedAt,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pokebinder_cloud_sync', { detail: { userId, updatedAt: updated.updatedAt } }));
    }

    return updated;
  }

  /**
   * Push local snapshot to cloud (IndexedDB cloudStore)
   */
  public static async pushSnapshot(userId: string, localData: Omit<CloudUserData, 'updatedAt'>): Promise<boolean> {
    try {
      await new Promise(r => setTimeout(r, 200));
      await this.saveUserCloudData(userId, localData);
      return true;
    } catch (e) {
      console.error('CloudRepository pushSnapshot error:', e);
      return false;
    }
  }

  /**
   * Pull cloud data for user
   */
  public static async pullData(userId: string): Promise<CloudUserData> {
    await new Promise(r => setTimeout(r, 150));
    return await this.getUserCloudData(userId);
  }
}
