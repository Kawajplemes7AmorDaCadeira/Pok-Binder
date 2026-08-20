/**
 * Supabase Deck Repository
 * Handles relational storage of decks and deck_cards with RLS.
 */

import { getSupabaseClient } from '../supabaseClient';
import { DeckEntity } from '../../../types/db';
import { toValidUUID } from '../../../database/idUtils';

export class SupabaseDeckRepository {
  public static async getAll(userId?: string): Promise<DeckEntity[]> {
    const client = getSupabaseClient();
    if (!client) return [];

    try {
      // 1. Fetch decks
      let decksQuery = client
        .from('decks')
        .select('*')
        .is('deleted_at', null);

      if (userId) {
        decksQuery = decksQuery.eq('user_id', userId);
      }

      const { data: decksData, error: decksError } = await decksQuery;

      if (decksError || !decksData) return [];

      // 2. Fetch deck_cards
      const deckIds = decksData.map((d) => d.id);
      if (deckIds.length === 0) return [];

      const { data: cardsData, error: cardsError } = await client
        .from('deck_cards')
        .select('*')
        .in('deck_id', deckIds);

      const cardsByDeck = new Map<string, any[]>();
      (cardsData || []).forEach((c) => {
        const list = cardsByDeck.get(c.deck_id) || [];
        list.push(c);
        cardsByDeck.set(c.deck_id, list);
      });

      return decksData.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description || undefined,
        format: d.format,
        coverCardPrintId: d.cover_card_id || undefined,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        deletedAt: d.deleted_at || undefined,
        cards: (cardsByDeck.get(d.id) || []).map((c) => ({
          cardPrintId: c.card_id,
          quantity: c.quantity,
        })),
      }));
    } catch (err) {
      console.error('SupabaseDeckRepository.getAll error:', err);
      return [];
    }
  }

  public static async upsertDeck(deck: DeckEntity, userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const validDeckId = toValidUUID(deck.id);
      // 1. Upsert deck parent
      const { error: deckErr } = await client.from('decks').upsert({
        id: validDeckId,
        user_id: userId,
        name: deck.name,
        description: deck.description || null,
        format: deck.format,
        cover_card_id: deck.coverCardPrintId || null,
        created_at: deck.createdAt || new Date().toISOString(),
        updated_at: deck.updatedAt || new Date().toISOString(),
        deleted_at: deck.deletedAt || null,
      });

      if (deckErr) return false;

      // 2. Delete and re-insert deck_cards
      await client.from('deck_cards').delete().eq('deck_id', validDeckId);

      if (deck.cards && deck.cards.length > 0) {
        const cardRows = deck.cards.map((c) => ({
          deck_id: validDeckId,
          user_id: userId,
          card_id: c.cardPrintId,
          variant: 'normal',
          quantity: c.quantity,
        }));
        await client.from('deck_cards').insert(cardRows);
      }

      return true;
    } catch (err) {
      console.error('SupabaseDeckRepository.upsertDeck error:', err);
      return false;
    }
  }

  public static async softDelete(deckId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('decks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', toValidUUID(deckId));
      return !error;
    } catch {
      return false;
    }
  }
}
