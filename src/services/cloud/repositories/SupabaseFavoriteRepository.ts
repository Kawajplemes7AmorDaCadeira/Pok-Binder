/**
 * Supabase Favorite Repository
 */

import { getSupabaseClient } from '../supabaseClient';
import { FavoriteEntity } from '../../../types/db';

export class SupabaseFavoriteRepository {
  public static async getAll(userId?: string): Promise<FavoriteEntity[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client.from('favorites').select('*');
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((f) => ({
        id: f.id,
        cardPrintId: f.card_id,
        createdAt: f.created_at,
      }));
    } catch {
      return [];
    }
  }

  public static async setFavorite(cardId: string, isFavorite: boolean, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      if (isFavorite) {
        const { error } = await client.from('favorites').upsert(
          { user_id: userId, card_id: cardId, created_at: new Date().toISOString() },
          { onConflict: 'user_id,card_id' }
        );
        return !error;
      } else {
        const { error } = await client.from('favorites').delete().match({ user_id: userId, card_id: cardId });
        return !error;
      }
    } catch {
      return false;
    }
  }
}
