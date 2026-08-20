/**
 * Supabase Wishlist Repository
 */

import { getSupabaseClient } from '../supabaseClient';
import { WishlistItemEntity } from '../../../types/db';

export class SupabaseWishlistRepository {
  public static async getAll(userId?: string): Promise<WishlistItemEntity[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client.from('wishlist_items').select('*').is('deleted_at', null);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((w) => ({
        id: w.id,
        cardPrintId: w.card_id,
        desiredQuantity: w.quantity || 1,
        targetPrice: w.target_price ? Number(w.target_price) : undefined,
        priority: (w.priority as any) || 'medium',
        notes: w.notes || undefined,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      }));
    } catch {
      return [];
    }
  }

  public static async upsert(item: WishlistItemEntity, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('wishlist_items').upsert({
        id: item.id,
        user_id: userId,
        card_id: item.cardPrintId,
        target_price: item.targetPrice || null,
        priority: item.priority || 'medium',
        quantity: item.desiredQuantity || 1,
        notes: item.notes || null,
        created_at: item.createdAt || new Date().toISOString(),
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
        .from('wishlist_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }
}
