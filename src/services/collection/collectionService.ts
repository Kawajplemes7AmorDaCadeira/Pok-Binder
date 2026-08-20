import { CollectionRepository } from '../../database/repositories/CollectionRepository';
import { CollectionItemEntity } from '../../types/db';
import { generateUUID } from '../../database/idUtils';
import { CardCondition, CardLanguage, CardVariant } from '../../types';

export interface CollectionFilterOptions {
  searchQuery?: string;
  setId?: string;
  variant?: CardVariant;
  condition?: CardCondition;
  language?: CardLanguage;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'quantity' | 'acquiredAt' | 'acquiredPrice' | 'set' | 'localId';
  sortOrder?: 'asc' | 'desc';
}

export interface ExpansionProgress {
  setId: string;
  setName: string;
  series: string;
  totalCardsInSet: number;
  uniqueCardsOwned: number;
  totalQuantityOwned: number;
  completionPercentage: number;
}

export interface CollectionStats {
  totalItemsQuantity: number;
  totalUniqueCards: number;
  totalEstimatedValue: number;
  rarityDistribution: Record<string, number>;
  variantDistribution: Record<string, number>;
  conditionDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  expansionProgress: ExpansionProgress[];
}

/**
 * Helper to extract set ID from card print ID or legacy ID formats
 */
export function extractSetIdFromCardPrintId(cardPrintId: string): string {
  if (!cardPrintId) return '';
  if (cardPrintId.startsWith('PKB:PRINT:')) {
    const parts = cardPrintId.split(':');
    return parts[3] || parts[2] || '';
  }
  if (cardPrintId.includes('-')) {
    return cardPrintId.split('-')[0];
  }
  return cardPrintId;
}

export class CollectionService {
  /**
   * Add a new item entry to collection
   */
  public static async addItem(itemData: Partial<CollectionItemEntity> & { cardPrintId: string }): Promise<CollectionItemEntity> {
    const item: CollectionItemEntity = {
      id: itemData.id || generateUUID(),
      cardPrintId: itemData.cardPrintId,
      quantity: itemData.quantity || 1,
      condition: itemData.condition || 'near_mint',
      variant: itemData.variant || 'normal',
      language: itemData.language || 'pt',
      acquiredAt: itemData.acquiredAt || new Date().toISOString(),
      acquiredPrice: itemData.acquiredPrice,
      notes: itemData.notes,
      location: itemData.location,
      source: itemData.source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return CollectionRepository.save(item);
  }

  /**
   * Update an existing collection item by ID
   */
  public static async updateItem(id: string, updates: Partial<CollectionItemEntity>): Promise<CollectionItemEntity | null> {
    const existing = await CollectionRepository.getById(id);
    if (!existing || existing.deletedAt) return null;

    const updated: CollectionItemEntity = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return CollectionRepository.save(updated);
  }

  /**
   * Delete item by ID
   */
  public static async deleteItem(id: string): Promise<boolean> {
    const existing = await CollectionRepository.getById(id);
    if (!existing) return false;

    await CollectionRepository.save({
      ...existing,
      quantity: 0,
      deletedAt: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Bulk delete multiple collection items
   */
  public static async bulkDelete(ids: string[]): Promise<number> {
    let deletedCount = 0;
    for (const id of ids) {
      const success = await this.deleteItem(id);
      if (success) deletedCount++;
    }
    return deletedCount;
  }

  /**
   * Filter & Sort Collection
   */
  public static filterCollection(
    items: CollectionItemEntity[],
    options: CollectionFilterOptions,
    cardMetaMap?: Record<string, { name: string; setName: string; localId: string; price?: number }>
  ): CollectionItemEntity[] {
    const { searchQuery, setId, variant, condition, language, minPrice, maxPrice, sortBy, sortOrder = 'asc' } = options;

    let filtered = items.filter((item) => !item.deletedAt && item.quantity > 0);

    if (setId) {
      filtered = filtered.filter((item) => item.cardPrintId.toLowerCase().includes(setId.toLowerCase()));
    }

    if (variant) {
      filtered = filtered.filter((item) => item.variant === variant);
    }

    if (condition) {
      filtered = filtered.filter((item) => item.condition === condition);
    }

    if (language) {
      filtered = filtered.filter((item) => item.language === language);
    }

    if (minPrice !== undefined) {
      filtered = filtered.filter((item) => (item.acquiredPrice || 0) >= minPrice);
    }

    if (maxPrice !== undefined) {
      filtered = filtered.filter((item) => (item.acquiredPrice || 0) <= maxPrice);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const meta = cardMetaMap ? cardMetaMap[item.cardPrintId] : undefined;
        const nameMatch = meta ? meta.name.toLowerCase().includes(q) : false;
        const setMatch = meta ? meta.setName.toLowerCase().includes(q) : false;
        const idMatch = item.cardPrintId.toLowerCase().includes(q);
        const notesMatch = item.notes ? item.notes.toLowerCase().includes(q) : false;
        const locationMatch = item.location ? item.location.toLowerCase().includes(q) : false;

        return nameMatch || setMatch || idMatch || notesMatch || locationMatch;
      });
    }

    if (sortBy) {
      filtered.sort((a, b) => {
        let valA: string | number = 0;
        let valB: string | number = 0;

        if (sortBy === 'quantity') {
          valA = a.quantity;
          valB = b.quantity;
        } else if (sortBy === 'acquiredAt') {
          valA = new Date(a.acquiredAt || a.createdAt).getTime();
          valB = new Date(b.acquiredAt || b.createdAt).getTime();
        } else if (sortBy === 'acquiredPrice') {
          valA = a.acquiredPrice || 0;
          valB = b.acquiredPrice || 0;
        } else if (cardMetaMap) {
          const metaA = cardMetaMap[a.cardPrintId];
          const metaB = cardMetaMap[b.cardPrintId];
          if (sortBy === 'name') {
            valA = metaA?.name || a.cardPrintId;
            valB = metaB?.name || b.cardPrintId;
          } else if (sortBy === 'set') {
            valA = metaA?.setName || '';
            valB = metaB?.setName || '';
          }
        }

        if (typeof valA === 'string' || typeof valB === 'string') {
          const strA = String(valA);
          const strB = String(valB);
          return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
        const numA = Number(valA);
        const numB = Number(valB);
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      });
    }

    return filtered;
  }

  /**
   * Calculate Collection Statistics & Expansion Completion Percentages
   */
  public static calculateStats(
    items: CollectionItemEntity[],
    cardMetaMap?: Record<string, { name: string; setName: string; series?: string; rarity?: string; price?: number }>,
    setsInfo?: Array<{ id: string; name: string; series: string; totalCards: number }>
  ): CollectionStats {
    const activeItems = items.filter((i) => !i.deletedAt && i.quantity > 0);

    let totalItemsQuantity = 0;
    let totalEstimatedValue = 0;

    const uniqueCardPrints = new Set<string>();
    const rarityDist: Record<string, number> = {};
    const variantDist: Record<string, number> = {};
    const conditionDist: Record<string, number> = {};
    const languageDist: Record<string, number> = {};
    const cardsOwnedBySet: Record<string, Set<string>> = {};
    const quantityOwnedBySet: Record<string, number> = {};

    activeItems.forEach((item) => {
      totalItemsQuantity += item.quantity;
      uniqueCardPrints.add(item.cardPrintId);

      // Estimated value calculation
      const meta = cardMetaMap ? cardMetaMap[item.cardPrintId] : undefined;
      const unitPrice = item.acquiredPrice || meta?.price || 0;
      totalEstimatedValue += unitPrice * item.quantity;

      // Variant
      variantDist[item.variant] = (variantDist[item.variant] || 0) + item.quantity;

      // Condition
      conditionDist[item.condition] = (conditionDist[item.condition] || 0) + item.quantity;

      // Language
      languageDist[item.language] = (languageDist[item.language] || 0) + item.quantity;

      // Rarity
      const rarity = meta?.rarity || 'Desconhecida';
      rarityDist[rarity] = (rarityDist[rarity] || 0) + item.quantity;

      // Set progress tracking
      const setId = extractSetIdFromCardPrintId(item.cardPrintId);
      if (!cardsOwnedBySet[setId]) {
        cardsOwnedBySet[setId] = new Set<string>();
        quantityOwnedBySet[setId] = 0;
      }
      cardsOwnedBySet[setId].add(item.cardPrintId);
      quantityOwnedBySet[setId] += item.quantity;
    });

    const expansionProgress: ExpansionProgress[] = (setsInfo || []).map((s) => {
      const uniqueCards = cardsOwnedBySet[s.id]?.size || 0;
      const totalQty = quantityOwnedBySet[s.id] || 0;
      const totalCards = s.totalCards > 0 ? s.totalCards : 100;
      const pct = Math.min(100, Math.round((uniqueCards / totalCards) * 100));

      return {
        setId: s.id,
        setName: s.name,
        series: s.series,
        totalCardsInSet: totalCards,
        uniqueCardsOwned: uniqueCards,
        totalQuantityOwned: totalQty,
        completionPercentage: pct,
      };
    });

    return {
      totalItemsQuantity,
      totalUniqueCards: uniqueCardPrints.size,
      totalEstimatedValue: Math.round(totalEstimatedValue * 100) / 100,
      rarityDistribution: rarityDist,
      variantDistribution: variantDist,
      conditionDistribution: conditionDist,
      languageDistribution: languageDist,
      expansionProgress,
    };
  }
}
