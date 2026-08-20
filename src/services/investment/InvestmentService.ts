import {
  CardPurchase,
  CardTransaction,
  CardVariant,
  CollectionFinancialSummary,
  CollectionItem,
  CollectionTimelineEvent,
  GlobalCardInvestmentSummary,
  InvestmentAnalysis,
  PokemonCard,
  TopMarketMover,
} from '../../types';
import { PriceService } from '../pricing/PriceService';

const TRANSACTIONS_KEY = 'pokebinder_transactions_v1';
const TIMELINE_KEY = 'pokebinder_timeline_v1';

export class InvestmentService {
  /**
   * Calculate investment metrics for a given subset of purchases and current market conditions.
   */
  public static calculateInvestment(
    purchases: CardPurchase[],
    currentMarketPrice: number | null = null,
    currentOwnedQuantity: number = 0,
    variant: CardVariant = 'normal'
  ): InvestmentAnalysis {
    let totalInvested = 0;
    let totalQuantityBought = 0;

    for (const p of purchases) {
      const qty = Math.max(1, p.quantity || 1);
      const paid = Number(p.totalPaid) || Number(p.pricePerCard) * qty || 0;
      totalInvested += paid;
      totalQuantityBought += qty;
    }

    const averagePricePaid = totalQuantityBought > 0 ? totalInvested / totalQuantityBought : 0;
    const effectiveQuantity = currentOwnedQuantity > 0 ? currentOwnedQuantity : totalQuantityBought;

    let currentEstimatedValue: number | null = null;
    let totalProfitLoss: number | null = null;
    let roiPercentage: number | null = null;

    if (currentMarketPrice !== null && currentMarketPrice !== undefined && currentMarketPrice > 0) {
      currentEstimatedValue = effectiveQuantity * currentMarketPrice;

      if (totalInvested > 0) {
        totalProfitLoss = currentEstimatedValue - totalInvested;
        roiPercentage = (totalProfitLoss / totalInvested) * 100;
      } else if (effectiveQuantity > 0) {
        totalProfitLoss = currentEstimatedValue;
        roiPercentage = 100;
      }
    }

    const isProfit = totalProfitLoss !== null && totalProfitLoss > 0.005;
    const isLoss = totalProfitLoss !== null && totalProfitLoss < -0.005;
    const isNeutral = !isProfit && !isLoss;

    return {
      variant,
      totalQuantityBought,
      totalInvested: Math.round(totalInvested * 100) / 100,
      averagePricePaid: Math.round(averagePricePaid * 100) / 100,
      currentOwnedQuantity: effectiveQuantity,
      currentMarketPrice: currentMarketPrice !== null ? Math.round(currentMarketPrice * 100) / 100 : null,
      currentEstimatedValue: currentEstimatedValue !== null ? Math.round(currentEstimatedValue * 100) / 100 : null,
      totalProfitLoss: totalProfitLoss !== null ? Math.round(totalProfitLoss * 100) / 100 : null,
      roiPercentage: roiPercentage !== null ? Math.round(roiPercentage * 100) / 100 : null,
      isProfit,
      isLoss,
      isNeutral,
    };
  }

  /**
   * Calculate full multi-variant investment analysis for a single card.
   */
  public static calculateGlobalCardInvestment(
    cardId: string,
    allPurchases: CardPurchase[],
    marketPricesByVariant: Record<string, number | null>,
    ownedQuantitiesByVariant: Record<string, number>
  ): GlobalCardInvestmentSummary {
    const cardPurchases = allPurchases.filter((p) => p.cardId === cardId);
    const variants: Record<string, InvestmentAnalysis> = {};

    let totalInvested = 0;
    let totalQuantityBought = 0;
    let currentOwnedQuantity = 0;
    let currentEstimatedValue = 0;

    const allVariants = new Set<CardVariant>([
      'normal',
      'holo',
      'reverse',
      ...cardPurchases.map((p) => p.variant),
      ...(Object.keys(ownedQuantitiesByVariant) as CardVariant[]),
    ]);

    for (const v of allVariants) {
      const variantPurchases = cardPurchases.filter((p) => p.variant === v);
      const mktPrice = marketPricesByVariant[v] ?? null;
      const ownedQty = ownedQuantitiesByVariant[v] ?? 0;

      const analysis = this.calculateInvestment(variantPurchases, mktPrice, ownedQty, v);
      variants[v] = analysis;

      totalInvested += analysis.totalInvested;
      totalQuantityBought += analysis.totalQuantityBought;
      currentOwnedQuantity += analysis.currentOwnedQuantity;
      if (analysis.currentEstimatedValue !== null) {
        currentEstimatedValue += analysis.currentEstimatedValue;
      }
    }

    const totalProfitLoss = currentEstimatedValue - totalInvested;
    const roiPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      cardId,
      totalQuantityBought,
      totalInvested: Math.round(totalInvested * 100) / 100,
      currentOwnedQuantity,
      currentEstimatedValue: Math.round(currentEstimatedValue * 100) / 100,
      totalProfitLoss: Math.round(totalProfitLoss * 100) / 100,
      roiPercentage: Math.round(roiPercentage * 100) / 100,
      variants,
    };
  }

  /**
   * Loads all saved transactions (purchases and sales).
   */
  public static getTransactions(): CardTransaction[] {
    try {
      const raw = localStorage.getItem(TRANSACTIONS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Registers a new purchase transaction.
   */
  public static recordPurchase(transaction: Omit<CardTransaction, 'id' | 'type'>): CardTransaction {
    const txList = this.getTransactions();
    const newTx: CardTransaction = {
      ...transaction,
      id: `tx_buy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'purchase',
    };

    const updated = [newTx, ...txList];
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));

    // Add Timeline Event
    this.addTimelineEvent({
      type: 'purchase',
      title: `Compra registrada: ${newTx.quantity}x ${newTx.cardName}`,
      description: `Comprado por ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newTx.unitPrice)} cada na loja/vendedor: ${newTx.buyerOrStore || 'Não informado'}`,
      cardId: newTx.cardId,
      cardName: newTx.cardName,
      amount: newTx.unitPrice * newTx.quantity,
    });

    return newTx;
  }

  /**
   * Registers a new sale transaction (Realized profit).
   */
  public static recordSale(transaction: Omit<CardTransaction, 'id' | 'type'>): CardTransaction {
    const txList = this.getTransactions();
    const newTx: CardTransaction = {
      ...transaction,
      id: `tx_sale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'sale',
    };

    const updated = [newTx, ...txList];
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));

    // Add Timeline Event
    this.addTimelineEvent({
      type: 'sale',
      title: `Venda registrada: ${newTx.quantity}x ${newTx.cardName}`,
      description: `Vendido por ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newTx.unitPrice)} cada para: ${newTx.buyerOrStore || 'Comprador anônimo'}`,
      cardId: newTx.cardId,
      cardName: newTx.cardName,
      amount: newTx.unitPrice * newTx.quantity,
    });

    return newTx;
  }

  /**
   * Calculates overall collection financial performance.
   */
  public static calculateFinancialSummary(
    collection: CollectionItem[],
    cardMap: Record<string, PokemonCard>
  ): CollectionFinancialSummary {
    const transactions = this.getTransactions();

    // 1. Current Market Value of all cards in collection
    let currentMarketValue = 0;
    collection.forEach((item) => {
      const card = cardMap[item.cardId];
      const marketPrice = PriceService.getCardMarketPrice(card, item.variant, item.condition);
      if (marketPrice !== null && marketPrice > 0) {
        currentMarketValue += marketPrice * item.quantity;
      }
    });

    // 2. Invested Amount (Purchases recorded OR fallback purchase history)
    let totalInvested = 0;
    const purchaseTransactions = transactions.filter((t) => t.type === 'purchase');

    if (purchaseTransactions.length > 0) {
      purchaseTransactions.forEach((tx) => {
        totalInvested += tx.unitPrice * tx.quantity;
      });
    } else {
      totalInvested = collection.reduce((sum, item) => {
        const card = cardMap[item.cardId];
        const marketPrice = PriceService.getCardMarketPrice(card, item.variant, item.condition);
        const base = marketPrice !== null && marketPrice > 0 ? marketPrice * 0.75 : 0;
        return sum + base * item.quantity;
      }, 0);
    }

    // 3. Realized Profit from Sales
    let realizedProfit = 0;
    let totalSalesVolume = 0;
    const salesTransactions = transactions.filter((t) => t.type === 'sale');

    salesTransactions.forEach((sale) => {
      totalSalesVolume += sale.unitPrice * sale.quantity;
      const matchingBuy = purchaseTransactions.find(
        (p) => p.cardId === sale.cardId && p.variant === sale.variant
      );
      const buyPrice = matchingBuy ? matchingBuy.unitPrice : sale.unitPrice * 0.65;
      realizedProfit += (sale.unitPrice - buyPrice) * sale.quantity;
    });

    // 4. Unrealized Profit
    const unrealizedProfit = currentMarketValue - totalInvested;
    const unrealizedProfitPercentage = totalInvested > 0 ? (unrealizedProfit / totalInvested) * 100 : 0;

    return {
      currentMarketValue: Number(currentMarketValue.toFixed(2)),
      totalInvested: Number(totalInvested.toFixed(2)),
      unrealizedProfit: Number(unrealizedProfit.toFixed(2)),
      unrealizedProfitPercentage: Number(unrealizedProfitPercentage.toFixed(2)),
      realizedProfit: Number(realizedProfit.toFixed(2)),
      totalSalesVolume: Number(totalSalesVolume.toFixed(2)),
      totalPurchasesCount: purchaseTransactions.length,
      totalSalesCount: salesTransactions.length,
    };
  }

  /**
   * Computes top gainers, top losers and most valuable cards.
   */
  public static getMarketRankings(
    collection: CollectionItem[],
    cardMap: Record<string, PokemonCard>
  ): {
    topGainers: TopMarketMover[];
    topLosers: TopMarketMover[];
    mostValuable: TopMarketMover[];
  } {
    const transactions = this.getTransactions().filter((t) => t.type === 'purchase');

    const movers: TopMarketMover[] = collection.map((item) => {
      const card = cardMap[item.cardId];
      const currentPrice = PriceService.getCardMarketPrice(card, item.variant, item.condition) ?? 0;

      const tx = transactions.find((t) => t.cardId === item.cardId && t.variant === item.variant);
      const investedPrice = tx ? tx.unitPrice : Math.max(0.5, Number((currentPrice * 0.8).toFixed(2)));

      const changeValue = Number((currentPrice - investedPrice).toFixed(2));
      const changePercentage = investedPrice > 0 ? Number((((currentPrice - investedPrice) / investedPrice) * 100).toFixed(1)) : 0;

      return {
        cardId: item.cardId,
        card,
        variant: item.variant,
        currentPrice,
        investedPrice,
        changeValue,
        changePercentage,
      };
    });

    const topGainers = [...movers]
      .filter((m) => m.changePercentage > 0)
      .sort((a, b) => b.changePercentage - a.changePercentage)
      .slice(0, 5);

    const topLosers = [...movers]
      .sort((a, b) => a.changePercentage - b.changePercentage)
      .slice(0, 5);

    const mostValuable = [...movers]
      .sort((a, b) => b.currentPrice - a.currentPrice)
      .slice(0, 6);

    return { topGainers, topLosers, mostValuable };
  }

  /**
   * Timeline management
   */
  public static getTimelineEvents(): CollectionTimelineEvent[] {
    try {
      const raw = localStorage.getItem(TIMELINE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static addTimelineEvent(event: Omit<CollectionTimelineEvent, 'id' | 'timestamp'>): void {
    try {
      const raw = localStorage.getItem(TIMELINE_KEY);
      const events: CollectionTimelineEvent[] = raw ? JSON.parse(raw) : [];
      const newEvent: CollectionTimelineEvent = {
        ...event,
        id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };

      const updated = [newEvent, ...events].slice(0, 100);
      localStorage.setItem(TIMELINE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}
