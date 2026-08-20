import { CollectionRepository } from '../../database/repositories/CollectionRepository';
import { PriceRepository } from '../../database/repositories/PriceRepository';
import { WishlistRepository } from '../../database/repositories/WishlistRepository';
import { TradeRepository } from '../../database/repositories/TradeRepository';
import { PriceSnapshotEntity, WishlistItemEntity, TradeItemEntity } from '../../types/db';

export interface FinancialBalanceReport {
  totalItemsInCollection: number;
  totalAcquisitionCost: number;
  totalCurrentMarketValue: number;
  netProfitLoss: number;
  roiPercentage: number;
  currency: string;
}

export interface WishlistSummary {
  itemsCount: number;
  totalDesiredCards: number;
  estimatedTotalCost: number;
  items: WishlistItemEntity[];
}

export interface TradeSummary {
  itemsCount: number;
  totalAvailableCards: number;
  estimatedTradeValue: number;
  items: TradeItemEntity[];
}

export class FinancialService {
  /**
   * Record price snapshot for a card print
   */
  public static async recordPriceSnapshot(
    cardPrintId: string,
    marketPrice: number,
    provider = 'LigaPokemon',
    currency = 'BRL',
    low?: number,
    high?: number
  ): Promise<PriceSnapshotEntity> {
    return PriceRepository.saveSnapshot({
      cardPrintId,
      market: marketPrice,
      low,
      high,
      provider,
      currency,
    });
  }

  /**
   * Get price history for a card print
   */
  public static async getPriceHistory(cardPrintId: string): Promise<PriceSnapshotEntity[]> {
    return PriceRepository.getHistory(cardPrintId);
  }

  /**
   * Get trend percentage for a card print
   */
  public static async calculatePriceTrend(cardPrintId: string): Promise<{ percentageChange: number; latestPrice: number }> {
    const history = await PriceRepository.getHistory(cardPrintId);
    if (history.length < 2) {
      const latest = history[0]?.market || 0;
      return { percentageChange: 0, latestPrice: latest };
    }

    const first = history[0].market || 0;
    const last = history[history.length - 1].market || 0;

    if (first === 0) return { percentageChange: 0, latestPrice: last };

    const diff = last - first;
    const pct = Math.round((diff / first) * 1000) / 10;

    return { percentageChange: pct, latestPrice: last };
  }

  /**
   * Calculate overall financial balance of the user collection
   */
  public static async calculateFinancialBalance(priceMapOverride?: Record<string, number>): Promise<FinancialBalanceReport> {
    const collection = await CollectionRepository.getAll();
    const activeItems = collection.filter((item) => !item.deletedAt && item.quantity > 0);

    let totalItemsInCollection = 0;
    let totalAcquisitionCost = 0;
    let totalCurrentMarketValue = 0;

    for (const item of activeItems) {
      totalItemsInCollection += item.quantity;
      const costPerUnit = item.acquiredPrice || 0;
      totalAcquisitionCost += costPerUnit * item.quantity;

      let marketPerUnit = priceMapOverride ? priceMapOverride[item.cardPrintId] : undefined;
      if (marketPerUnit === undefined) {
        const snapshot = await PriceRepository.getLatest(item.cardPrintId);
        marketPerUnit = snapshot?.market || costPerUnit;
      }

      totalCurrentMarketValue += marketPerUnit * item.quantity;
    }

    const netProfitLoss = Math.round((totalCurrentMarketValue - totalAcquisitionCost) * 100) / 100;
    const roiPercentage =
      totalAcquisitionCost > 0
        ? Math.round((netProfitLoss / totalAcquisitionCost) * 1000) / 10
        : 0;

    return {
      totalItemsInCollection,
      totalAcquisitionCost: Math.round(totalAcquisitionCost * 100) / 100,
      totalCurrentMarketValue: Math.round(totalCurrentMarketValue * 100) / 100,
      netProfitLoss,
      roiPercentage,
      currency: 'BRL',
    };
  }

  /**
   * Get Wishlist Summary & Total Estimated Cost
   */
  public static async getWishlistSummary(priceMapOverride?: Record<string, number>): Promise<WishlistSummary> {
    const items = await WishlistRepository.getAll();
    let totalDesiredCards = 0;
    let estimatedTotalCost = 0;

    for (const item of items) {
      totalDesiredCards += item.desiredQuantity;
      let price = item.targetPrice;
      if (price === undefined) {
        price = priceMapOverride ? priceMapOverride[item.cardPrintId] : undefined;
      }
      if (price === undefined) {
        const snapshot = await PriceRepository.getLatest(item.cardPrintId);
        price = snapshot?.market || 0;
      }
      estimatedTotalCost += price * item.desiredQuantity;
    }

    return {
      itemsCount: items.length,
      totalDesiredCards,
      estimatedTotalCost: Math.round(estimatedTotalCost * 100) / 100,
      items,
    };
  }

  /**
   * Get Trade Summary & Total Estimated Trade Value
   */
  public static async getTradeSummary(priceMapOverride?: Record<string, number>): Promise<TradeSummary> {
    const items = await TradeRepository.getAll();
    let totalAvailableCards = 0;
    let estimatedTradeValue = 0;

    for (const item of items) {
      totalAvailableCards += item.availableQuantity;
      let price = priceMapOverride ? priceMapOverride[item.cardPrintId] : undefined;
      if (price === undefined) {
        const snapshot = await PriceRepository.getLatest(item.cardPrintId);
        price = snapshot?.market || 0;
      }
      estimatedTradeValue += price * item.availableQuantity;
    }

    return {
      itemsCount: items.length,
      totalAvailableCards,
      estimatedTradeValue: Math.round(estimatedTradeValue * 100) / 100,
      items,
    };
  }
}
