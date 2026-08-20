/**
 * Currency & Money Types for PokéBinder TCG
 */

export type Currency = 'BRL' | 'USD' | 'EUR';

export interface Money {
  amount: number;
  currency: Currency;
}

export type MarketSource = 'LIGA_POKEMON' | 'MYPCARDS' | 'TCGPLAYER' | 'CARDMARKET';

export const SOURCE_CURRENCY: Record<MarketSource, Currency> = {
  LIGA_POKEMON: 'BRL',
  MYPCARDS: 'BRL',
  TCGPLAYER: 'USD',
  CARDMARKET: 'EUR',
} as const;
