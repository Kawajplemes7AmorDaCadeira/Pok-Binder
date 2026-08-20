/**
 * Realtime Sync Service
 * Subscribes to PostgreSQL realtime change data capture (CDC) via Supabase Channels.
 * Reconciles incoming remote changes into local IndexedDB and dispatches UI events.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabaseClient';
import { CollectionItemEntity, DeckEntity, WishlistItemEntity } from '../../../types/db';
import { CardCondition, CardLanguage, CardVariant } from '../../../types';
import { CollectionRepository } from '../../../database/repositories/CollectionRepository';
import { DeckRepository } from '../../../database/repositories/DeckRepository';
import { FavoriteRepository } from '../../../database/repositories/FavoriteRepository';
import { WishlistRepository } from '../../../database/repositories/WishlistRepository';
import { StorageService } from '../../storage';
import { SyncConflictResolver } from './SyncConflictResolver';

export type RealtimeChangeCallback = (entityType: string, eventType: string, record: any) => void;

export class RealtimeSyncService {
  private static channel: RealtimeChannel | null = null;
  private static listeners: Set<RealtimeChangeCallback> = new Set();
  private static subscribedUserId: string | null = null;

  public static addListener(cb: RealtimeChangeCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private static notify(entityType: string, eventType: string, record: any) {
    this.listeners.forEach((cb) => {
      try {
        cb(entityType, eventType, record);
      } catch (err) {
        console.error('Realtime listener error:', err);
      }
    });
  }

  public static subscribeToRemoteUpdates(cb: () => void): () => void {
    return this.addListener(() => {
      cb();
    });
  }

  public static subscribe(userId: string): void {
    const client = getSupabaseClient();
    if (!client || (this.channel && this.subscribedUserId === userId)) {
      return;
    }

    this.unsubscribe();
    this.subscribedUserId = userId;

    const userChannel = client.channel(`user-sync-${userId}`);

    // 1. Listen to collection changes
    userChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_items',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          await this.handleCollectionChange(payload);
        }
      )
      // 2. Listen to deck changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decks',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          await this.handleDeckChange(payload);
        }
      )
      // 3. Listen to favorites
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          await this.handleFavoriteChange(payload);
        }
      )
      // 4. Listen to wishlist
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist_items',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          await this.handleWishlistChange(payload);
        }
      );

    userChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('⚡ Realtime sync channel connected for user:', userId);
      }
    });

    this.channel = userChannel;
  }

  public static unsubscribe(): void {
    if (this.channel) {
      const client = getSupabaseClient();
      if (client) {
        client.removeChannel(this.channel);
      }
      this.channel = null;
      this.subscribedUserId = null;
    }
  }

  private static async handleCollectionChange(payload: any): Promise<void> {
    const row = payload.new || payload.old;
    if (!row) return;

    const cloudEntity: CollectionItemEntity = {
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

    // Reconcile with local Dexie / storage
    const local = await CollectionRepository.findByCardVariantCondition(
      cloudEntity.cardPrintId,
      cloudEntity.variant,
      cloudEntity.condition,
      cloudEntity.language
    );

    const resolved = SyncConflictResolver.resolveCollectionItem(local, cloudEntity);

    if (resolved) {
      if (resolved.deletedAt || resolved.quantity <= 0) {
        if (local) await CollectionRepository.delete(local.id);
      } else {
        await CollectionRepository.save(resolved);
      }
      // Keep legacy storage in sync
      const all = await CollectionRepository.getAll();
      StorageService.saveCollection(
        all.map((i) => ({
          id: i.id,
          cardId: i.cardPrintId,
          language: i.language,
          variant: i.variant,
          quantity: i.quantity,
          condition: i.condition,
          notes: i.notes,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        }))
      );
    }

    this.notify('collection', payload.eventType, resolved);
  }

  private static async handleDeckChange(payload: any): Promise<void> {
    const row = payload.new || payload.old;
    if (!row) return;

    if (row.deleted_at) {
      await DeckRepository.delete(row.id);
    }
    this.notify('deck', payload.eventType, row);
  }

  private static async handleFavoriteChange(payload: any): Promise<void> {
    const row = payload.new || payload.old;
    if (!row) return;

    if (payload.eventType === 'DELETE') {
      await FavoriteRepository.remove(row.card_id);
    } else {
      await FavoriteRepository.add(row.card_id);
    }
    this.notify('favorite', payload.eventType, row);
  }

  private static async handleWishlistChange(payload: any): Promise<void> {
    const row = payload.new || payload.old;
    if (!row) return;

    if (row.deleted_at) {
      await WishlistRepository.remove(row.id);
    }
    this.notify('wishlist', payload.eventType, row);
  }
}
