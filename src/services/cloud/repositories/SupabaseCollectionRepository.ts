/**
 * Supabase Collection Repository
 * Interacts with PostgreSQL collection_items using RLS and Atomic Increment RPCs.
 */

import { getSupabaseClient } from '../supabaseClient';
import { CollectionItemRow } from '../types';
import { CollectionItemEntity } from '../../../types/db';
import { CardCondition, CardLanguage, CardVariant } from '../../../types';

export class SupabaseCollectionRepository {
  /**
   * Fetch all active collection items for the authenticated user
   */
  public static async getAll(): Promise<CollectionItemEntity[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('collection_items')
        .select('*')
        .is('deleted_at', null);

      if (error) {
        console.error('SupabaseCollectionRepository.getAll error:', error);
        return [];
      }

      return (data || []).map(this.mapRowToEntity);
    } catch (err) {
      console.error('SupabaseCollectionRepository.getAll exception:', err);
      return [];
    }
  }

  /**
   * Atomic Quantity Increment using PostgreSQL RPC (Concurrency-safe)
   */
  public static async atomicIncrement(params: {
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    language: CardLanguage;
    delta: number;
    notes?: string;
    itemId?: string;
  }): Promise<CollectionItemEntity | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.rpc('increment_collection_quantity', {
        p_card_id: params.cardId,
        p_variant: params.variant,
        p_condition: params.condition,
        p_language: params.language,
        p_delta: params.delta,
        p_notes: params.notes || null,
        p_item_id: params.itemId || null,
      });

      if (error) {
        console.error('SupabaseCollectionRepository.atomicIncrement error:', error);
        return null;
      }

      return data ? this.mapRowToEntity(data) : null;
    } catch (err) {
      console.error('SupabaseCollectionRepository.atomicIncrement exception:', err);
      return null;
    }
  }

  /**
   * Atomic Quantity Decrement using PostgreSQL RPC
   */
  public static async atomicDecrement(params: {
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    language: CardLanguage;
    delta: number;
  }): Promise<CollectionItemEntity | null> {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
      const { data, error } = await client.rpc('decrement_collection_quantity', {
        p_card_id: params.cardId,
        p_variant: params.variant,
        p_condition: params.condition,
        p_language: params.language,
        p_delta: params.delta,
      });

      if (error) {
        console.error('SupabaseCollectionRepository.atomicDecrement error:', error);
        return null;
      }

      return data ? this.mapRowToEntity(data) : null;
    } catch (err) {
      console.error('SupabaseCollectionRepository.atomicDecrement exception:', err);
      return null;
    }
  }

  /**
   * Upsert a full collection item
   */
  public static async upsert(item: CollectionItemEntity, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const row: Partial<CollectionItemRow> = {
        id: item.id,
        user_id: userId,
        card_id: item.cardPrintId,
        variant: item.variant,
        condition: item.condition,
        language: item.language,
        quantity: item.quantity,
        notes: item.notes || null,
        deleted_at: item.deletedAt || null,
        updated_at: item.updatedAt || new Date().toISOString(),
      };

      const { error } = await client.from('collection_items').upsert(row, {
        onConflict: 'user_id,card_id,variant,condition,language',
      });

      if (error) {
        console.error('SupabaseCollectionRepository.upsert error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('SupabaseCollectionRepository.upsert exception:', err);
      return false;
    }
  }

  /**
   * Bulk Upsert for initial migration
   */
  public static async bulkUpsert(items: CollectionItemEntity[], userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client || items.length === 0) return true;

    try {
      const rows: Partial<CollectionItemRow>[] = items.map((i) => ({
        id: i.id,
        user_id: userId,
        card_id: i.cardPrintId,
        variant: i.variant,
        condition: i.condition,
        language: i.language,
        quantity: i.quantity,
        notes: i.notes || null,
        deleted_at: i.deletedAt || null,
        created_at: i.createdAt || new Date().toISOString(),
        updated_at: i.updatedAt || new Date().toISOString(),
      }));

      // Batch in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await client.from('collection_items').upsert(chunk, {
          onConflict: 'user_id,card_id,variant,condition,language',
        });
        if (error) {
          console.error('SupabaseCollectionRepository.bulkUpsert chunk error:', error);
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error('SupabaseCollectionRepository.bulkUpsert exception:', err);
      return false;
    }
  }

  /**
   * Soft Delete an item
   */
  public static async softDelete(
    cardId: string,
    variant: CardVariant,
    condition: CardCondition,
    language: CardLanguage
  ): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('collection_items')
        .update({ deleted_at: new Date().toISOString(), quantity: 0 })
        .match({ card_id: cardId, variant, condition, language });

      return !error;
    } catch {
      return false;
    }
  }

  private static mapRowToEntity(row: CollectionItemRow): CollectionItemEntity {
    return {
      id: row.id,
      cardPrintId: row.card_id,
      variant: row.variant as CardVariant,
      condition: row.condition as CardCondition,
      language: row.language as CardLanguage,
      quantity: row.quantity,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at || undefined,
    };
  }
}
