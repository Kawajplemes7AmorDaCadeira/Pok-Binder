import { db } from '../database';
import { generateUUID } from '../idUtils';
import { FavoriteEntity } from '../../types/db';

export class FavoriteRepository {
  public static async getAll(): Promise<FavoriteEntity[]> {
    return db.favorites.toArray();
  }

  public static async getCardPrintIds(): Promise<string[]> {
    const favorites = await db.favorites.toArray();
    return favorites.map((f) => f.cardPrintId);
  }

  public static async isFavorite(cardPrintId: string): Promise<boolean> {
    const fav = await db.favorites.where('cardPrintId').equals(cardPrintId).first();
    return !!fav;
  }

  public static async toggle(cardPrintId: string): Promise<string[]> {
    const existing = await db.favorites.where('cardPrintId').equals(cardPrintId).first();
    if (existing) {
      await db.favorites.delete(existing.id);
    } else {
      const newFav: FavoriteEntity = {
        id: generateUUID(),
        cardPrintId,
        createdAt: new Date().toISOString(),
      };
      await db.favorites.put(newFav);
    }
    return this.getCardPrintIds();
  }

  public static async bulkSave(favorites: FavoriteEntity[]): Promise<void> {
    await db.favorites.bulkPut(favorites);
  }
}
