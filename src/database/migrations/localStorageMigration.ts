import { db } from '../database';
import { generateUUID } from '../idUtils';
import { CollectionItemEntity, DeckEntity, FavoriteEntity } from '../../types/db';

const STORAGE_KEYS = {
  COLLECTION: 'pokebinder_collection_v1',
  DECKS: 'pokebinder_decks_v1',
  FAVORITES: 'pokebinder_favorites_v1',
  SETTINGS: 'pokebinder_settings_v1',
};

export async function migrateFromLocalStorageIfNeeded(): Promise<boolean> {
  try {
    // Check if already migrated
    const meta = await db.syncMetadata.get('migrated_from_localStorage');
    if (meta && meta.value === 'true') {
      return false; // Already migrated
    }

    console.log('📦 Starting automatic migration from localStorage to IndexedDB...');

    // 1. Migrate Collection
    const rawCollection = localStorage.getItem(STORAGE_KEYS.COLLECTION);
    if (rawCollection) {
      try {
        const parsedCollection = JSON.parse(rawCollection);
        if (Array.isArray(parsedCollection) && parsedCollection.length > 0) {
          const collectionEntities: CollectionItemEntity[] = parsedCollection.map((item: any) => ({
            id: item.id || generateUUID(),
            cardPrintId: item.cardPrintId || item.cardId, // preserve cardPrintId link
            quantity: item.quantity || 1,
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

          await db.collectionItems.bulkPut(collectionEntities);
          console.log(`✅ Migrated ${collectionEntities.length} collection items to IndexedDB.`);
        }
      } catch (err) {
        console.error('Failed to parse collection during migration', err);
      }
    }

    // 2. Migrate Decks
    const rawDecks = localStorage.getItem(STORAGE_KEYS.DECKS);
    if (rawDecks) {
      try {
        const parsedDecks = JSON.parse(rawDecks);
        if (Array.isArray(parsedDecks) && parsedDecks.length > 0) {
          const deckEntities: DeckEntity[] = parsedDecks.map((d: any) => ({
            id: d.id || generateUUID(),
            name: d.name || 'Sem nome',
            description: d.description,
            format: d.format || 'Standard',
            coverCardPrintId: d.coverCardPrintId || d.coverCardId,
            cards: (d.cards || []).map((c: any) => ({
              cardPrintId: c.cardPrintId || c.cardId,
              quantity: c.quantity || 1,
            })),
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          }));

          await db.decks.bulkPut(deckEntities);
          console.log(`✅ Migrated ${deckEntities.length} decks to IndexedDB.`);
        }
      } catch (err) {
        console.error('Failed to parse decks during migration', err);
      }
    }

    // 3. Migrate Favorites
    const rawFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (rawFavorites) {
      try {
        const parsedFavorites = JSON.parse(rawFavorites);
        if (Array.isArray(parsedFavorites) && parsedFavorites.length > 0) {
          const favEntities: FavoriteEntity[] = parsedFavorites.map((cardId: string) => ({
            id: generateUUID(),
            cardPrintId: cardId,
            createdAt: new Date().toISOString(),
          }));

          await db.favorites.bulkPut(favEntities);
          console.log(`✅ Migrated ${favEntities.length} favorites to IndexedDB.`);
        }
      } catch (err) {
        console.error('Failed to parse favorites during migration', err);
      }
    }

    // Mark migration as completed
    await db.syncMetadata.put({
      key: 'migrated_from_localStorage',
      value: 'true',
      updatedAt: new Date().toISOString(),
    });

    console.log('🎉 IndexedDB Migration complete!');
    return true;
  } catch (error) {
    console.error('❌ Migration from localStorage failed:', error);
    return false;
  }
}
