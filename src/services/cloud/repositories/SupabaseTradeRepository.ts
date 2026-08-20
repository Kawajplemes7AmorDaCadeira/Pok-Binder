/**
 * Supabase Trade Repository
 */

import { getSupabaseClient } from '../supabaseClient';
import { TradeItemEntity } from '../../../types/db';

export class SupabaseTradeRepository {
  public static async getAll(userId?: string): Promise<TradeItemEntity[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client.from('trades').select('*').is('deleted_at', null);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((t) => ({
        id: t.id,
        cardPrintId: t.card_id,
        availableQuantity: t.quantity || 1,
        notes: t.notes || undefined,
        updatedAt: t.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public static async upsert(item: TradeItemEntity, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('trades').upsert({
        id: item.id,
        user_id: userId,
        card_id: item.cardPrintId,
        quantity: item.availableQuantity || 1,
        notes: item.notes || null,
        updated_at: item.updatedAt || new Date().toISOString(),
        deleted_at: null,
      });
      return !error;
    } catch {
      return false;
    }
  }

  public static async softDelete(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('trades')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }
}
