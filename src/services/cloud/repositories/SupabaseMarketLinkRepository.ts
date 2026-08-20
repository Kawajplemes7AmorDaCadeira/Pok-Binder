/**
 * Supabase Market Link Repository
 * Syncs Liga Pokémon and MYPCards direct URLs across PC & Mobile.
 */

import { getSupabaseClient } from '../supabaseClient';
import { CardCondition, CardVariant } from '../../../types';
import { CardMarketLink, MarketSource } from '../../../types/market';

export class SupabaseMarketLinkRepository {
  public static async getAll(): Promise<CardMarketLink[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client.from('market_links').select('*');
      if (error || !data) return [];
      return data.map((l) => ({
        id: l.id,
        cardId: l.card_id,
        variant: l.variant as CardVariant,
        condition: l.condition as CardCondition,
        source: l.source as MarketSource,
        url: l.url,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public static async saveLink(link: CardMarketLink, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('market_links').upsert(
        {
          user_id: userId,
          card_id: link.cardId,
          variant: link.variant,
          condition: link.condition,
          source: link.source,
          url: link.url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,card_id,variant,condition,source' }
      );
      return !error;
    } catch {
      return false;
    }
  }

  public static async deleteLink(
    cardId: string,
    variant: CardVariant,
    condition: CardCondition,
    source: MarketSource
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('market_links')
        .delete()
        .match({ card_id: cardId, variant, condition, source });
      return !error;
    } catch {
      return false;
    }
  }
}
