/**
 * Sync Conflict Resolver for Multi-Device Data Reconciliation
 * Implements entity-specific resolution policies (Never LWW for Quantities).
 */

import { CollectionItemEntity, DeckEntity, WishlistItemEntity } from '../../../types/db';

export class SyncConflictResolver {
  /**
   * Resolves collection items merge between local cache and cloud row
   * For the same entity (card + variant + condition + language):
   * - If one is soft-deleted and updated more recently, it remains deleted.
   * - Otherwise, prioritize the highest valid quantity or most recent non-deleted update.
   */
  public static resolveCollectionItem(
    local: CollectionItemEntity | null,
    cloud: CollectionItemEntity | null
  ): CollectionItemEntity | null {
    if (!local && !cloud) return null;
    if (!local) return cloud;
    if (!cloud) return local;

    // Check soft deletion timestamps
    if (cloud.deletedAt && (!local.deletedAt || new Date(cloud.deletedAt) >= new Date(local.updatedAt))) {
      return cloud;
    }
    if (local.deletedAt && (!cloud.deletedAt || new Date(local.deletedAt) >= new Date(cloud.updatedAt))) {
      return local;
    }

    const localTime = new Date(local.updatedAt || local.createdAt).getTime();
    const cloudTime = new Date(cloud.updatedAt || cloud.createdAt).getTime();

    // If both exist and active, take the max quantity to avoid losing newly scanned cards across devices
    const resolvedQty = Math.max(local.quantity, cloud.quantity);

    return {
      id: cloud.id || local.id,
      cardPrintId: cloud.cardPrintId,
      variant: cloud.variant,
      condition: cloud.condition,
      language: cloud.language,
      quantity: resolvedQty,
      notes: cloudTime >= localTime ? cloud.notes : local.notes,
      createdAt: local.createdAt || cloud.createdAt,
      updatedAt: new Date(Math.max(localTime, cloudTime)).toISOString(),
      deletedAt: undefined,
    };
  }

  /**
   * Resolves deck conflicts using Last-Write-Wins based on updated_at
   */
  public static resolveDeck(local: DeckEntity | null, cloud: DeckEntity | null): DeckEntity | null {
    if (!local && !cloud) return null;
    if (!local) return cloud;
    if (!cloud) return local;

    if (cloud.deletedAt) return cloud;
    if (local.deletedAt) return local;

    const localTime = new Date(local.updatedAt || local.createdAt).getTime();
    const cloudTime = new Date(cloud.updatedAt || cloud.createdAt).getTime();

    return cloudTime >= localTime ? cloud : local;
  }

  /**
   * Resolves wishlist item conflicts
   */
  public static resolveWishlistItem(
    local: WishlistItemEntity | null,
    cloud: WishlistItemEntity | null
  ): WishlistItemEntity | null {
    if (!local && !cloud) return null;
    if (!local) return cloud;
    if (!cloud) return local;

    const localTime = new Date(local.updatedAt || local.createdAt).getTime();
    const cloudTime = new Date(cloud.updatedAt || cloud.createdAt).getTime();

    return cloudTime >= localTime ? cloud : local;
  }
}
