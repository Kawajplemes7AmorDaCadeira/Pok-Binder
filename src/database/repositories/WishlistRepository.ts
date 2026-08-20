import { db } from '../database';
import { WishlistItemEntity } from '../../types/db';
import { generateUUID } from '../idUtils';

export class WishlistRepository {
  public static async getAll(): Promise<WishlistItemEntity[]> {
    return db.wishlist.toArray();
  }

  public static async getById(id: string): Promise<WishlistItemEntity | undefined> {
    return db.wishlist.get(id);
  }

  public static async save(itemData: Partial<WishlistItemEntity> & { cardPrintId: string }): Promise<WishlistItemEntity> {
    const item: WishlistItemEntity = {
      id: itemData.id || generateUUID(),
      cardPrintId: itemData.cardPrintId,
      priority: itemData.priority || 'medium',
      desiredQuantity: itemData.desiredQuantity || 1,
      targetPrice: itemData.targetPrice,
      notes: itemData.notes,
      createdAt: itemData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.wishlist.put(item);
    return item;
  }

  public static async remove(id: string): Promise<void> {
    await db.wishlist.delete(id);
  }

  public static async clear(): Promise<void> {
    await db.wishlist.clear();
  }
}
