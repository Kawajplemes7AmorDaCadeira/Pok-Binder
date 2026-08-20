/**
 * Supabase Collection Repository
 * Interacts with PostgreSQL collection_items using RLS and Atomic Increment RPCs.
 */

import { getSupabaseClient } from '../supabaseClient';
import { CollectionItemRow } from '../types';
import { CollectionItemEntity } from '../../../types/db';
import { CardCondition, CardLanguage, CardVariant } from '../../../types';
import { toValidUUID } from '../../../database/idUtils';
import { SyncStatusService } from '../sync/SyncStatusService';

export class SupabaseCollectionRepository {
  private static checkSchemaError(error: any) {
    if (!error) return;
    if (error.code === 'PGRST205' || (error.message && (error.message.includes('schema cache') || error.message.includes('does not exist')))) {
      SyncStatusService.update({ isSchemaMissing: true, state: 'SCHEMA_MISSING' });
    }
  }

  /**
   * Fetch all active collection items for the authenticated user
   */
  public static async getAll(userId?: string): Promise<CollectionItemEntity[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      let query = client
        .from('collection_items')
        .select('*')
        .is('deleted_at', null);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        this.checkSchemaError(error);
        if (error.code !== 'PGRST205') {
          console.warn('SupabaseCollectionRepository.getAll error:', error.message || error);
        }
        return [];
      }

      // If successful, reset schema missing flag
      SyncStatusService.update({ isSchemaMissing: false });
      return (data || []).map(this.mapRowToEntity);
    } catch (err: any) {
      this.checkSchemaError(err);
      return [];
    }
  }

  /**
   * Atomic Quantity Increment using PostgreSQL RPC (Concurrency-safe) with Direct Table Fallback
   */
  public static async atomicIncrement(params: {
    cardId: string;
    variant: CardVariant;
    condition: CardCondition;
    language: CardLanguage;
    delta: number;
    notes?: string;
    itemId?: string;
    userId?: string;
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
        // Fallback to direct table query & upsert
        const effectiveUserId = params.userId || (await client.auth.getUser()).data.user?.id;
        if (!effectiveUserId) return null;

        const { data: existingRows } = await client
          .from('collection_items')
          .select('*')
          .eq('user_id', effectiveUserId)
          .eq('card_id', params.cardId)
          .eq('variant', params.variant)
          .eq('condition', params.condition)
          .eq('language', params.language)
          .is('deleted_at', null)
          .limit(1);

        const existing = existingRows && existingRows[0];
        const newQty = (existing ? existing.quantity : 0) + params.delta;
        const rowId = toValidUUID(existing ? existing.id : params.itemId);

        const { data: upserted, error: upsertErr } = await client
          .from('collection_items')
          .upsert({
            id: rowId,
            user_id: effectiveUserId,
            card_id: params.cardId,
            variant: params.variant,
            condition: params.condition,
            language: params.language,
            quantity: newQty,
            notes: params.notes || (existing ? existing.notes : null),
            deleted_at: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,card_id,variant,condition,language' })
          .select()
          .single();

        if (upsertErr) {
          this.checkSchemaError(upsertErr);
          if (upsertErr.code !== 'PGRST205') {
            console.warn('Fallback direct upsert failed:', upsertErr.message || upsertErr);
          }
          return null;
        }
        return upserted ? this.mapRowToEntity(upserted) : null;
      }

      return data ? this.mapRowToEntity(data) : null;
    } catch (err) {
      console.error('SupabaseCollectionRepository.atomicIncrement exception:', err);
      return null;
    }
  }

  /**
   * Atomic Quantity Decrement using PostgreSQL RPC with Direct Table Fallback
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
        // Fallback to direct table decrement/delete
        const { data: { user } } = await client.auth.getUser();
        if (!user) return null;

        const { data: existingRows } = await client
          .from('collection_items')
          .select('*')
          .eq('card_id', params.cardId)
          .eq('variant', params.variant)
          .eq('condition', params.condition)
          .eq('language', params.language)
          .is('deleted_at', null)
          .limit(1);

        const existing = existingRows && existingRows[0];
        if (!existing) return null;

        const newQty = Math.max(0, existing.quantity - params.delta);
        const isDeleted = newQty <= 0;

        const { data: updated, error: updateErr } = await client
          .from('collection_items')
          .update({
            quantity: newQty,
            deleted_at: isDeleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateErr) {
          console.error('Fallback decrement update failed:', updateErr);
          return null;
        }
        return updated ? this.mapRowToEntity(updated) : null;
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
        id: toValidUUID(item.id),
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
        this.checkSchemaError(error);
        if (error.code !== 'PGRST205') {
          console.warn('SupabaseCollectionRepository.upsert error:', error.message || error);
        }
        return false;
      }
      return true;
    } catch (err: any) {
      this.checkSchemaError(err);
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
        id: toValidUUID(i.id),
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
          this.checkSchemaError(error);
          if (error.code !== 'PGRST205') {
            console.warn('SupabaseCollectionRepository.bulkUpsert chunk error:', error.message || error);
          }
          return false;
        }
      }
      return true;
    } catch (err: any) {
      this.checkSchemaError(err);
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

      if (error) {
        this.checkSchemaError(error);
        return false;
      }
      return true;
    } catch (err: any) {
      this.checkSchemaError(err);
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
