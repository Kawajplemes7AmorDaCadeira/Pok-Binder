/**
 * PriceService.ts - Centralized pricing service integrating BrazilianPriceParser,
 * CurrencyConversionService, and PriceAuditService (v3).
 */

import { CardCondition, CardVariant, PokemonCard, PriceConfidenceInfo, PriceHistoryPoint } from '../../types';
import { AggregatedMarketPrice, CardMarketPrice } from '../../types/market';
import { CurrencyConversionService } from './CurrencyConversionService';
import { PriceAuditService, BRAZIL_PRICE_POLICY_VERSION, PriceCalculationTrace } from './PriceAuditService';
import { LinkedMarketPriceService } from './LinkedMarketPriceService';

const PRICE_HISTORY_STORAGE_KEY = 'pokebinder_price_history_v1';
const PRICE_CACHE_PREFIX = 'pokebinder_price_cache_v';

export class PriceService {
  static filterOutliers(values: number[]): number[] {
    return PriceAuditService.filterOutliers(values).accepted;
  }

  static calculateMedian(values: number[]): number {
    return PriceAuditService.calculateMedian(values);
  }

  /**
   * Performs price resolution prioritizing LinkedMarketPriceService (Hybrid Manual + Direct Links).
   * If no manual or linked price exists, returns unavailable ("Sem cotação").
   */
  static getAggregatedMarketPrice(
    card?: PokemonCard,
    variant: CardVariant = 'normal',
    condition: CardCondition = 'near_mint',
    language: string = 'pt',
    forceRefresh: boolean = false
  ): AggregatedMarketPrice {
    if (!card) {
      return {
        cardId: '',
        variant,
        condition,
        currency: 'BRL',
        marketPrice: null,
        medianPrice: null,
        averagePrice: null,
        lowestPrice: null,
        highestPrice: null,
        sources: [],
        fetchedAt: new Date().toISOString(),
        isCached: false,
        isUnavailable: true,
        confidenceScore: 0,
      };
    }

    // Check LinkedMarketPriceService (Hybrid Manual + Direct Links) first
    const linked = LinkedMarketPriceService.getAggregatedLinkedPrice(card.id, variant, condition);
    const hasLinkedOrManual = linked.ligaPrice !== null || linked.mypPrice !== null;

    if (hasLinkedOrManual) {
      const cardSources: CardMarketPrice[] = [];
      const nowIso = new Date().toISOString();

      if (linked.ligaPrice !== null) {
        cardSources.push({
          cardId: card.id,
          source: 'Liga Pokémon',
          variant,
          condition,
          currency: 'BRL',
          lowest: linked.ligaPrice,
          average: linked.ligaPrice,
          highest: linked.ligaPrice,
          listings: 1,
          fetchedAt: linked.ligaRecord?.fetchedAt || nowIso,
        });
      }

      if (linked.mypPrice !== null) {
        cardSources.push({
          cardId: card.id,
          source: 'MYPCards',
          variant,
          condition,
          currency: 'BRL',
          lowest: linked.mypPrice,
          average: linked.mypPrice,
          highest: linked.mypPrice,
          listings: 1,
          fetchedAt: linked.mypRecord?.fetchedAt || nowIso,
        });
      }

      const validPrices = [linked.ligaPrice, linked.mypPrice].filter((p): p is number => p !== null && p > 0);
      const marketPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

      return {
        cardId: card.id,
        variant,
        condition,
        currency: 'BRL',
        marketPrice,
        medianPrice: marketPrice,
        averagePrice: marketPrice,
        lowestPrice: marketPrice,
        highestPrice: marketPrice ? Number((marketPrice * 1.1).toFixed(2)) : null,
        sources: cardSources,
        fetchedAt: nowIso,
        isCached: true,
        isUnavailable: marketPrice === null,
        confidenceScore: 100,
        brazilConfidence: 'HIGH',
        ligaPokemon: linked.ligaPrice !== null ? {
          source: 'Liga Pokémon',
          lowest: linked.ligaPrice,
          median: linked.ligaPrice,
          listings: 1,
          variant,
          condition,
          fetchedAt: linked.ligaRecord?.fetchedAt || nowIso,
        } : undefined,
        mypCards: linked.mypPrice !== null ? {
          source: 'MYPCards',
          lowest: linked.mypPrice,
          median: linked.mypPrice,
          listings: 1,
          variant,
          condition,
          fetchedAt: linked.mypRecord?.fetchedAt || nowIso,
        } : undefined,
        usedSources: cardSources.map(s => s.source),
      };
    }

    // If no manual or linked price exists, return unavailable ("Sem cotação")
    return {
      cardId: card.id,
      variant,
      condition,
      currency: 'BRL',
      marketPrice: null,
      medianPrice: null,
      averagePrice: null,
      lowestPrice: null,
      highestPrice: null,
      sources: [],
      fetchedAt: new Date().toISOString(),
      isCached: false,
      isUnavailable: true,
      confidenceScore: 0,
    };
  }

  static getCardMarketPrice(
    card?: PokemonCard,
    variant: CardVariant = 'normal',
    condition: CardCondition = 'near_mint',
    language: string = 'pt'
  ): number | null {
    if (!card) return 2.00;
    const agg = this.getAggregatedMarketPrice(card, variant, condition, language);
    if (agg.marketPrice !== null && agg.marketPrice > 0) {
      return agg.marketPrice;
    }
    // Baseline rarity fallback estimate
    const rarity = card.rarity?.toLowerCase() || '';
    if (rarity.includes('secret') || rarity.includes('ultra') || rarity.includes('illustration') || rarity.includes('special') || rarity.includes('ex') || rarity.includes('vmax') || rarity.includes('vstar')) {
      return 25.00;
    } else if (rarity.includes('rare') || rarity.includes('holo')) {
      return 5.00;
    }
    return 2.00;
  }

  static getPriceConfidence(
    card?: PokemonCard,
    variant: CardVariant = 'normal',
    condition: CardCondition = 'near_mint',
    language: string = 'pt'
  ): PriceConfidenceInfo {
    const agg = this.getAggregatedMarketPrice(card, variant, condition, language);
    const sources = agg.sources.map((s) => ({
      name: s.source,
      price: s.lowest || s.average || 0,
    }));

    return {
      level: agg.brazilConfidence === 'HIGH' ? 'alta' : agg.brazilConfidence === 'MEDIUM' ? 'media' : 'baixa',
      sourceCount: sources.length,
      lastUpdated: agg.fetchedAt,
      sources,
      medianPrice: agg.medianPrice ?? 0,
    };
  }

  static getPriceHistory(cardId: string, variant: CardVariant = 'normal'): PriceHistoryPoint[] {
    try {
      const raw = localStorage.getItem(PRICE_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const history: PriceHistoryPoint[] = JSON.parse(raw);
      return history.filter((p) => p.cardId === cardId && p.variant === variant);
    } catch {
      return [];
    }
  }

  static recordPricePoint(
    cardIdOrPoint: string | PriceHistoryPoint,
    variant?: CardVariant,
    price?: number,
    source?: string
  ): void {
    try {
      const raw = localStorage.getItem(PRICE_HISTORY_STORAGE_KEY);
      const history: PriceHistoryPoint[] = raw ? JSON.parse(raw) : [];
      if (typeof cardIdOrPoint === 'object') {
        history.push(cardIdOrPoint);
      } else if (typeof cardIdOrPoint === 'string' && variant && price !== undefined) {
        history.push({
          cardId: cardIdOrPoint,
          variant,
          price,
          source: source || 'Market Sync',
          timestamp: new Date().toISOString(),
        });
      }
      localStorage.setItem(PRICE_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }
}
