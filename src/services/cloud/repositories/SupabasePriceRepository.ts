/**
 * Supabase Price Repository
 * Stores Brazilian manual prices (Liga Pokémon, MYPCards in BRL) & personal price history.
 */

import { getSupabaseClient } from '../supabaseClient';
import { CardCondition, CardVariant } from '../../../types';
import { MarketSource } from '../../../types/market';

export interface CloudMarketPrice {
  id: string;
  cardId: string;
  variant: CardVariant;
  condition: CardCondition;
  source: MarketSource;
  amount: number;
  currency: string;
  origin: string;
  createdAt: string;
  updatedAt: string;
}

export class SupabasePriceRepository {
  public static async getAll(): Promise<CloudMarketPrice[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client.from('market_prices').select('*');
      if (error || !data) return [];
      return data.map((p) => ({
        id: p.id,
        cardId: p.card_id,
        variant: p.variant as CardVariant,
        condition: p.condition as CardCondition,
        source: p.source as MarketSource,
        amount: Number(p.amount),
        currency: p.currency || 'BRL',
        origin: p.origin || 'manual',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public static async upsertPrice(price: Omit<CloudMarketPrice, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('market_prices').upsert(
        {
          user_id: userId,
          card_id: price.cardId,
          variant: price.variant,
          condition: price.condition,
          source: price.source,
          amount: price.amount,
          currency: price.currency || 'BRL',
          origin: price.origin || 'manual',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,card_id,variant,condition,source' }
      );

      // Also record snapshot in price_history
      if (!error) {
        await client.from('price_history').insert({
          user_id: userId,
          card_id: price.cardId,
          variant: price.variant,
          condition: price.condition,
          source: price.source,
          amount: price.amount,
          currency: price.currency || 'BRL',
          recorded_at: new Date().toISOString(),
        });
      }

      return !error;
    } catch {
      return false;
    }
  }
}
