/**
 * Supabase Purchase Repository
 */

import { getSupabaseClient } from '../supabaseClient';
import { CardCondition, CardVariant } from '../../../types';
import { CardPurchaseEntity } from '../../../types/db';

export class SupabasePurchaseRepository {
  public static async getAll(): Promise<CardPurchaseEntity[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client.from('card_purchases').select('*');
      if (error || !data) return [];
      return data.map((p) => ({
        id: p.id,
        cardId: p.card_id,
        variant: (p.variant as CardVariant) || 'normal',
        condition: (p.condition as CardCondition) || 'near_mint',
        quantity: p.quantity || 1,
        pricePerCard: Number(p.price_paid) / (p.quantity || 1),
        totalPaid: Number(p.price_paid),
        currency: p.currency || 'BRL',
        seller: p.vendor || undefined,
        notes: p.notes || undefined,
        purchasedAt: p.purchased_at,
        createdAt: p.created_at,
      }));
    } catch {
      return [];
    }
  }

  public static async addPurchase(purchase: CardPurchaseEntity, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('card_purchases').insert({
        id: purchase.id,
        user_id: userId,
        card_id: purchase.cardId,
        variant: purchase.variant || 'normal',
        condition: purchase.condition || 'near_mint',
        quantity: purchase.quantity || 1,
        price_paid: purchase.totalPaid || (purchase.pricePerCard * purchase.quantity),
        currency: purchase.currency || 'BRL',
        vendor: purchase.seller || null,
        notes: purchase.notes || null,
        purchased_at: purchase.purchasedAt || new Date().toISOString(),
        created_at: purchase.createdAt || new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  }
}
