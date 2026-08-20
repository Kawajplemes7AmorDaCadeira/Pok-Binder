import { db } from '../database';
import { generateUUID } from '../idUtils';
import { CollectionItemEntity } from '../../types/db';
import { CardCondition, CardLanguage, CardVariant } from '../../types';

export class CollectionRepository {
  /**
   * Get all active (non-deleted) collection items
   */
  public static async getAll(): Promise<CollectionItemEntity[]> {
    return db.collectionItems
      .filter((item) => !item.deletedAt)
      .toArray();
  }

  /**
   * Get item by ID
   */
  public static async getById(id: string): Promise<CollectionItemEntity | undefined> {
    return db.collectionItems.get(id);
  }

  /**
   * Find item by unique physical attributes
   */
  public static async findByCardVariantCondition(
    cardPrintId: string,
    variant: CardVariant = 'normal',
    condition: CardCondition = 'near_mint',
    language: CardLanguage = 'pt'
  ): Promise<CollectionItemEntity | null> {
    const item = await db.collectionItems
      .where('cardPrintId')
      .equals(cardPrintId)
      .filter((i) => i.variant === variant && i.condition === condition && i.language === language)
      .first();

    return item || null;
  }

  /**
   * Delete item by ID
   */
  public static async delete(id: string): Promise<void> {
    await db.collectionItems.delete(id);
  }

  /**
   * Get items by card print ID
   */
  public static async getByCardPrintId(cardPrintId: string): Promise<CollectionItemEntity[]> {
    return db.collectionItems
      .where('cardPrintId')
      .equals(cardPrintId)
      .filter((item) => !item.deletedAt)
      .toArray();
  }

  /**
   * Save or update collection item
   */
  public static async save(item: CollectionItemEntity): Promise<CollectionItemEntity> {
    const updated = {
      ...item,
      updatedAt: new Date().toISOString(),
    };
    await db.collectionItems.put(updated);
    return updated;
  }

  /**
   * Update card quantity
   */
  public static async updateQuantity(
    cardPrintId: string,
    delta: number,
    variant: CardVariant = 'normal',
    language: CardLanguage = 'pt',
    condition: CardCondition = 'near_mint'
  ): Promise<CollectionItemEntity[]> {
    const existingItems = await db.collectionItems
      .where('cardPrintId')
      .equals(cardPrintId)
      .filter((item) => !item.deletedAt && item.variant === variant && item.language === language)
      .toArray();

    if (existingItems.length > 0) {
      const existing = existingItems[0];
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        // Soft delete or remove
        await db.collectionItems.update(existing.id, {
          quantity: 0,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        await db.collectionItems.update(existing.id, {
          quantity: newQty,
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (delta > 0) {
      const newItem: CollectionItemEntity = {
        id: generateUUID(),
        cardPrintId,
        quantity: delta,
        condition,
        variant,
        language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collectionItems.put(newItem);
    }

    return this.getAll();
  }

  /**
   * Remove sample items (e.g., col_1 .. col_5)
   */
  public static async removeSampleCards(): Promise<CollectionItemEntity[]> {
    const sampleItems = await db.collectionItems
      .filter((item) => item.id.startsWith('col_'))
      .toArray();

    for (const item of sampleItems) {
      await db.collectionItems.delete(item.id);
    }

    return this.getAll();
  }

  /**
   * Clear all items
   */
  public static async clearAll(): Promise<void> {
    await db.collectionItems.clear();
  }

  /**
   * Bulk save items
   */
  public static async bulkSave(items: CollectionItemEntity[]): Promise<void> {
    await db.collectionItems.bulkPut(items);
  }
}
