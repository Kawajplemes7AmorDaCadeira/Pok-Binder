import { db } from '../database';
import { CardPurchaseEntity } from '../../types/db';
import { CardCondition, CardPurchase, CardVariant } from '../../types';
import { generateUUID } from '../idUtils';

const PURCHASES_STORAGE_KEY = 'pokebinder_purchases_v1';

export class PurchaseRepository {
  /**
   * Get all purchases for a specific card
   */
  public static async getByCardId(cardId: string): Promise<CardPurchase[]> {
    try {
      const items = await db.cardPurchases
        .where('cardId')
        .equals(cardId)
        .toArray();

      if (items.length > 0) {
        return items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch (e) {
      console.warn('Dexie getByCardId fallback to localStorage', e);
    }

    // LocalStorage fallback
    const all = this.getAllLocal();
    return all
      .filter((p) => p.cardId === cardId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get purchases for a specific card and specific variant
   */
  public static async getByCardIdAndVariant(
    cardId: string,
    variant: CardVariant
  ): Promise<CardPurchase[]> {
    const list = await this.getByCardId(cardId);
    return list.filter((p) => p.variant === variant);
  }

  /**
   * Get all purchases across the whole collection
   */
  public static async getAll(): Promise<CardPurchase[]> {
    try {
      const items = await db.cardPurchases.toArray();
      if (items.length > 0) {
        return items;
      }
    } catch (e) {
      console.warn('Dexie getAll fallback to localStorage', e);
    }
    return this.getAllLocal();
  }

  /**
   * Add a new card purchase entry
   */
  public static async addPurchase(
    purchaseData: Omit<CardPurchase, 'id' | 'createdAt'>
  ): Promise<CardPurchase> {
    const newPurchase: CardPurchase = {
      id: `purch_${Date.now()}_${generateUUID().slice(0, 8)}`,
      cardId: purchaseData.cardId,
      variant: purchaseData.variant || 'normal',
      condition: purchaseData.condition || 'near_mint',
      quantity: Math.max(1, purchaseData.quantity || 1),
      pricePerCard: Number(purchaseData.pricePerCard) || 0,
      totalPaid:
        Number(purchaseData.totalPaid) ||
        (Number(purchaseData.pricePerCard) || 0) * Math.max(1, purchaseData.quantity || 1),
      currency: purchaseData.currency || 'BRL',
      purchasedAt: purchaseData.purchasedAt || new Date().toISOString().slice(0, 10),
      seller: purchaseData.seller?.trim() || undefined,
      notes: purchaseData.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      await db.cardPurchases.put(newPurchase);
    } catch (e) {
      console.warn('Dexie put purchase error, saving to localStorage', e);
    }

    this.saveToLocal(newPurchase);
    return newPurchase;
  }

  /**
   * Update an existing card purchase
   */
  public static async updatePurchase(
    purchase: CardPurchase
  ): Promise<CardPurchase> {
    const updated: CardPurchase = {
      ...purchase,
      quantity: Math.max(1, purchase.quantity || 1),
      pricePerCard: Number(purchase.pricePerCard) || 0,
      totalPaid:
        Number(purchase.totalPaid) ||
        (Number(purchase.pricePerCard) || 0) * Math.max(1, purchase.quantity || 1),
      seller: purchase.seller?.trim() || undefined,
      notes: purchase.notes?.trim() || undefined,
    };

    try {
      await db.cardPurchases.put(updated);
    } catch (e) {
      console.warn('Dexie put purchase error on update', e);
    }

    this.saveToLocal(updated);
    return updated;
  }

  /**
   * Quick save/update price for existing owned copies
   */
  public static async setQuickPriceForOwned(
    cardId: string,
    variant: CardVariant,
    condition: CardCondition,
    quantity: number,
    pricePerCard: number
  ): Promise<CardPurchase> {
    const existing = await this.getByCardIdAndVariant(cardId, variant);
    if (existing.length > 0) {
      // Update first matching purchase or adjust
      const first = existing[0];
      return this.updatePurchase({
        ...first,
        quantity,
        pricePerCard,
        totalPaid: pricePerCard * quantity,
        condition,
      });
    }

    return this.addPurchase({
      cardId,
      variant,
      condition,
      quantity,
      pricePerCard,
      totalPaid: pricePerCard * quantity,
      currency: 'BRL',
      purchasedAt: new Date().toISOString().slice(0, 10),
    });
  }

  /**
   * Delete purchase by ID
   */
  public static async deletePurchase(id: string): Promise<boolean> {
    try {
      await db.cardPurchases.delete(id);
    } catch (e) {
      console.warn('Dexie delete purchase error', e);
    }

    const localList = this.getAllLocal().filter((p) => p.id !== id);
    localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(localList));
    return true;
  }

  /**
   * Bulk save purchases (for migrations/imports)
   */
  public static async bulkSave(purchases: CardPurchase[]): Promise<void> {
    try {
      await db.cardPurchases.bulkPut(purchases);
    } catch (e) {
      console.warn('Dexie bulkPut purchases error', e);
    }
    localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(purchases));
  }

  // --- LocalStorage helpers for seamless sync ---
  private static getAllLocal(): CardPurchase[] {
    try {
      const data = localStorage.getItem(PURCHASES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static saveToLocal(item: CardPurchase): void {
    const list = this.getAllLocal().filter((p) => p.id !== item.id);
    list.push(item);
    localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(list));
  }
}
