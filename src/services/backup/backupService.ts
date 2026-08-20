import { CollectionRepository } from '../../database/repositories/CollectionRepository';
import { DeckRepository } from '../../database/repositories/DeckRepository';
import { FavoriteRepository } from '../../database/repositories/FavoriteRepository';
import { WishlistRepository } from '../../database/repositories/WishlistRepository';
import { TradeRepository } from '../../database/repositories/TradeRepository';
import { generateUUID } from '../../database/idUtils';
import { CollectionItemEntity, DeckEntity, FavoriteEntity, WishlistItemEntity, TradeItemEntity } from '../../types/db';

export interface FullBackupData {
  schemaVersion: number;
  timestamp: string;
  app: string;
  collection: CollectionItemEntity[];
  decks: DeckEntity[];
  favorites: FavoriteEntity[];
  wishlist: WishlistItemEntity[];
  tradeItems: TradeItemEntity[];
}

export interface PostImportReport {
  success: boolean;
  importedCollectionCount: number;
  importedDecksCount: number;
  importedFavoritesCount: number;
  importedWishlistCount: number;
  importedTradeItemsCount: number;
  durationMs: number;
  errors: string[];
}

export class BackupService {
  /**
   * Export full backup JSON snapshot
   */
  public static async exportBackupJSON(): Promise<string> {
    const collection = await CollectionRepository.getAll();
    const decks = await DeckRepository.getAll();
    const favorites = await FavoriteRepository.getAll();
    const wishlist = await WishlistRepository.getAll();
    const tradeItems = await TradeRepository.getAll();

    const data: FullBackupData = {
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      app: 'PokeBinder V2',
      collection,
      decks,
      favorites,
      wishlist,
      tradeItems,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Resilient import with validation, sanitization, and post-import report
   */
  public static async importBackupJSON(jsonString: string): Promise<PostImportReport> {
    const startTime = Date.now();
    const errors: string[] = [];

    let importedCollectionCount = 0;
    let importedDecksCount = 0;
    let importedFavoritesCount = 0;
    let importedWishlistCount = 0;
    let importedTradeItemsCount = 0;

    try {
      if (!jsonString || jsonString.trim() === '') {
        throw new Error('Arquivo de backup vazio.');
      }

      const data = JSON.parse(jsonString);

      // Validate schema
      if (!data || typeof data !== 'object') {
        throw new Error('Formato JSON inválido.');
      }

      // 1. Sanitize & Import Collection
      if (Array.isArray(data.collection)) {
        const sanitizedCollection: CollectionItemEntity[] = data.collection
          .filter((item: any) => item && (item.cardPrintId || item.cardId))
          .map((item: any) => ({
            id: item.id || generateUUID(),
            cardPrintId: item.cardPrintId || item.cardId,
            quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
            condition: item.condition || 'near_mint',
            variant: item.variant || 'normal',
            language: item.language || 'pt',
            acquiredAt: item.acquiredAt || item.createdAt || new Date().toISOString(),
            acquiredPrice: item.acquiredPrice,
            notes: item.notes,
            location: item.location,
            source: item.source,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
          }));

        if (sanitizedCollection.length > 0) {
          await CollectionRepository.bulkSave(sanitizedCollection);
          importedCollectionCount = sanitizedCollection.length;
        }
      }

      // 2. Sanitize & Import Decks
      if (Array.isArray(data.decks)) {
        const sanitizedDecks: DeckEntity[] = data.decks
          .filter((d: any) => d && d.name)
          .map((d: any) => ({
            id: d.id || generateUUID(),
            name: d.name,
            description: d.description || '',
            format: d.format || 'Standard',
            coverCardPrintId: d.coverCardPrintId || d.coverCardId,
            cards: Array.isArray(d.cards)
              ? d.cards.map((c: any) => ({
                  cardPrintId: c.cardPrintId || c.cardId,
                  quantity: c.quantity || 1,
                }))
              : [],
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          }));

        if (sanitizedDecks.length > 0) {
          await DeckRepository.bulkSave(sanitizedDecks);
          importedDecksCount = sanitizedDecks.length;
        }
      }

      // 3. Sanitize & Import Favorites
      if (Array.isArray(data.favorites)) {
        const sanitizedFavs: FavoriteEntity[] = data.favorites.map((fav: any) => {
          const cardPrintId = typeof fav === 'string' ? fav : fav.cardPrintId || fav.cardId;
          return {
            id: fav.id || generateUUID(),
            cardPrintId,
            createdAt: fav.createdAt || new Date().toISOString(),
          };
        });

        if (sanitizedFavs.length > 0) {
          await FavoriteRepository.bulkSave(sanitizedFavs);
          importedFavoritesCount = sanitizedFavs.length;
        }
      }

      // 4. Sanitize & Import Wishlist
      if (Array.isArray(data.wishlist)) {
        for (const w of data.wishlist) {
          if (w.cardPrintId || w.cardId) {
            await WishlistRepository.save({
              id: w.id || generateUUID(),
              cardPrintId: w.cardPrintId || w.cardId,
              priority: w.priority || 'medium',
              desiredQuantity: w.desiredQuantity || 1,
              targetPrice: w.targetPrice,
              notes: w.notes,
            });
            importedWishlistCount++;
          }
        }
      }

      // 5. Sanitize & Import Trade Items
      if (Array.isArray(data.tradeItems)) {
        for (const t of data.tradeItems) {
          if (t.cardPrintId || t.cardId) {
            await TradeRepository.save({
              id: t.id || generateUUID(),
              cardPrintId: t.cardPrintId || t.cardId,
              availableQuantity: t.availableQuantity || 1,
              notes: t.notes,
            });
            importedTradeItemsCount++;
          }
        }
      }

      return {
        success: true,
        importedCollectionCount,
        importedDecksCount,
        importedFavoritesCount,
        importedWishlistCount,
        importedTradeItemsCount,
        durationMs: Date.now() - startTime,
        errors,
      };
    } catch (err: any) {
      console.error('BackupService.importBackupJSON error', err);
      errors.push(err?.message || 'Falha geral ao importar backup.');

      return {
        success: false,
        importedCollectionCount: 0,
        importedDecksCount: 0,
        importedFavoritesCount: 0,
        importedWishlistCount: 0,
        importedTradeItemsCount: 0,
        durationMs: Date.now() - startTime,
        errors,
      };
    }
  }
}
