import { db } from '../database';
import { TradeItemEntity } from '../../types/db';
import { generateUUID } from '../idUtils';

export class TradeRepository {
  public static async getAll(): Promise<TradeItemEntity[]> {
    return db.tradeItems.toArray();
  }

  public static async getById(id: string): Promise<TradeItemEntity | undefined> {
    return db.tradeItems.get(id);
  }

  public static async save(itemData: Partial<TradeItemEntity> & { cardPrintId: string }): Promise<TradeItemEntity> {
    const item: TradeItemEntity = {
      id: itemData.id || generateUUID(),
      cardPrintId: itemData.cardPrintId,
      availableQuantity: itemData.availableQuantity || 1,
      notes: itemData.notes,
      updatedAt: new Date().toISOString(),
    };

    await db.tradeItems.put(item);
    return item;
  }

  public static async remove(id: string): Promise<void> {
    await db.tradeItems.delete(id);
  }

  public static async clear(): Promise<void> {
    await db.tradeItems.clear();
  }
}
