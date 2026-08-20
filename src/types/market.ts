import { CardCondition, CardVariant } from '../types';

export type MarketSource = 'LIGA_POKEMON' | 'MYPCARDS';

export interface CardMarketLink {
  cardId: string;
  variant: CardVariant;
  condition: CardCondition;
  source: MarketSource;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketPriceHistoryEntry {
  cardId: string;
  variant: CardVariant;
  condition: CardCondition;
  source: MarketSource;
  amount: number;
  currency: 'BRL';
  origin: 'MANUAL' | 'LINK_UPDATE';
  timestamp: string;
}

export interface LinkedPriceRecord {
  cardId: string;
  variant: CardVariant;
  condition: CardCondition;
  source: MarketSource;
  amount: number | null;
  currency: 'BRL';
  origin: 'MANUAL' | 'LINK_UPDATE';
  fetchedAt: string;
  lastValidAmount: number | null;
  lastValidAt: string | null;
  error?: string;
}

export interface LinkedPriceUpdateResult {
  success: boolean;
  source: MarketSource;
  price?: {
    amount: number;
    currency: 'BRL';
  };
  fetchedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  lastValidAmount?: number | null;
  lastValidAt?: string | null;
}

export interface CardPurchase {
  id: string;
  cardId: string; // matches cardPrintId e.g. sv03.5-025
  variant: CardVariant;
  condition: CardCondition;
  quantity: number;
  pricePerCard: number;
  totalPaid: number;
  currency: 'BRL' | string;
  purchasedAt?: string; // ISO date string e.g. '2026-08-18'
  seller?: string;
  notes?: string;
  createdAt: string;
}

export interface CardMarketPrice {
  cardId: string;
  source: string;
  variant: CardVariant;
  condition?: CardCondition;
  currency: 'BRL' | string;
  lowest?: number;
  average?: number;
  highest?: number;
  listings?: number;
  confidenceScore?: number;
  matchDetails?: string;
  fetchedAt: string;
}

export interface BrazilianSourceSummary {
  source: string;
  lowest: number | null;
  median: number | null;
  average?: number | null;
  highest?: number | null;
  listings: number;
  variant?: CardVariant;
  condition?: CardCondition;
  fetchedAt: string;
}

export interface AggregatedMarketPrice {
  cardId: string;
  variant: CardVariant;
  condition?: CardCondition;
  currency: 'BRL';
  marketPrice: number | null;
  medianPrice: number | null;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  sources: CardMarketPrice[];
  fetchedAt: string;
  isCached: boolean;
  isUnavailable: boolean;
  confidenceScore: number;
  brazilConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  ligaPokemon?: BrazilianSourceSummary;
  mypCards?: BrazilianSourceSummary;
  internationalReference?: number;
  usedSources?: string[];
}

export interface InvestmentAnalysis {
  variant: CardVariant;
  totalQuantityBought: number;
  totalInvested: number;
  averagePricePaid: number;
  currentOwnedQuantity: number;
  currentMarketPrice: number | null;
  currentEstimatedValue: number | null;
  totalProfitLoss: number | null;
  roiPercentage: number | null;
  isProfit: boolean;
  isLoss: boolean;
  isNeutral: boolean;
}

export interface GlobalCardInvestmentSummary {
  cardId: string;
  totalQuantityBought: number;
  totalInvested: number;
  currentOwnedQuantity: number;
  currentEstimatedValue: number;
  totalProfitLoss: number;
  roiPercentage: number;
  variants: Record<string, InvestmentAnalysis>;
}
