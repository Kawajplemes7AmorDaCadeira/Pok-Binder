import { db } from '../database';
import { PriceSnapshotEntity } from '../../types/db';
import { CardCondition, CardMarketPrice, CardVariant } from '../../types';
import { generateUUID } from '../idUtils';

export class PriceRepository {
  /**
   * Save a price snapshot
   */
  public static async saveSnapshot(
    snapshot: Partial<PriceSnapshotEntity> & { cardPrintId: string }
  ): Promise<PriceSnapshotEntity> {
    const entity: PriceSnapshotEntity = {
      id: snapshot.id || generateUUID(),
      cardPrintId: snapshot.cardPrintId,
      provider: snapshot.provider || 'LigaPokemon',
      variant: snapshot.variant || 'normal',
      condition: snapshot.condition || 'near_mint',
      currency: snapshot.currency || 'BRL',
      market: snapshot.market,
      low: snapshot.low,
      mid: snapshot.mid,
      high: snapshot.high,
      listings: snapshot.listings,
      confidenceScore: snapshot.confidenceScore,
      matchDetails: snapshot.matchDetails,
      recordedAt: snapshot.recordedAt || new Date().toISOString(),
    };

    try {
      await db.prices.put(entity);
    } catch (e) {
      console.warn('Dexie save price snapshot warning', e);
    }
    return entity;
  }

  /**
   * Save normalized CardMarketPrice item
   */
  public static async saveMarketPrice(price: CardMarketPrice): Promise<PriceSnapshotEntity> {
    return this.saveSnapshot({
      cardPrintId: price.cardId,
      provider: price.source,
      variant: price.variant,
      condition: price.condition,
      currency: price.currency,
      market: price.average || price.lowest,
      low: price.lowest,
      mid: price.average,
      high: price.highest,
      listings: price.listings,
      confidenceScore: price.confidenceScore,
      matchDetails: price.matchDetails,
      recordedAt: price.fetchedAt,
    });
  }

  /**
   * Get price history for a specific card and variant
   */
  public static async getHistoryForVariant(
    cardPrintId: string,
    variant: CardVariant = 'normal'
  ): Promise<PriceSnapshotEntity[]> {
    try {
      const snapshots = await db.prices
        .where('cardPrintId')
        .equals(cardPrintId)
        .filter((p) => !p.variant || p.variant === variant)
        .toArray();

      return snapshots.sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );
    } catch (e) {
      console.warn('PriceRepository getHistoryForVariant error', e);
      return [];
    }
  }

  /**
   * Get latest snapshot for card print ID and variant
   */
  public static async getLatestForVariant(
    cardPrintId: string,
    variant: CardVariant = 'normal'
  ): Promise<PriceSnapshotEntity | undefined> {
    const history = await this.getHistoryForVariant(cardPrintId, variant);
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * Get price history for a specific card print ID (all variants)
   */
  public static async getHistory(cardPrintId: string): Promise<PriceSnapshotEntity[]> {
    try {
      const snapshots = await db.prices
        .where('cardPrintId')
        .equals(cardPrintId)
        .toArray();

      return snapshots.sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );
    } catch (e) {
      console.warn('PriceRepository getHistory error', e);
      return [];
    }
  }

  /**
   * Get latest snapshot for card print ID
   */
  public static async getLatest(cardPrintId: string): Promise<PriceSnapshotEntity | undefined> {
    const history = await this.getHistory(cardPrintId);
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * Bulk save price snapshots
   */
  public static async bulkSave(snapshots: PriceSnapshotEntity[]): Promise<void> {
    try {
      await db.prices.bulkPut(snapshots);
    } catch (e) {
      console.warn('PriceRepository bulkSave error', e);
    }
  }
}
