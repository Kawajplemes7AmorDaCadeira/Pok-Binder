import { CardLanguage, CardSet, CatalogFilterOptions, PokemonCard } from '../types';
import { SetSyncService } from './setSyncService';
import { fetchCardById as apiFetchCardById, parseCardNumber } from './tcgdex';

export class CardProvider {
  private static defaultLanguage: CardLanguage = 'pt';
  private static inFlightCardRequests = new Map<string, Promise<PokemonCard | null>>();
  private static memoryCardCache = new Map<string, PokemonCard>();

  public static setDefaultLanguage(lang: CardLanguage) {
    this.defaultLanguage = lang;
  }

  public static getDefaultLanguage(): CardLanguage {
    return this.defaultLanguage;
  }

  /**
   * Get list of all available card sets (dynamically synced)
   */
  public static async getSets(lang: CardLanguage = this.defaultLanguage): Promise<CardSet[]> {
    return SetSyncService.getAvailableSets(lang);
  }

  /**
   * Get single set metadata by ID
   */
  public static async getSetById(setId: string, lang: CardLanguage = this.defaultLanguage): Promise<CardSet | null> {
    const sets = await this.getSets(lang);
    const found = sets.find((s) => s.id.toLowerCase() === setId.toLowerCase() || s.code?.toLowerCase() === setId.toLowerCase());
    return found || null;
  }

  /**
   * Get all cards in a set, ordered strictly by numerical position
   */
  public static async getCardsBySet(setId: string, lang: CardLanguage = this.defaultLanguage): Promise<PokemonCard[]> {
    const cards = await SetSyncService.syncCardsForSet(setId, lang);
    for (const card of cards) {
      if (card?.id) {
        this.memoryCardCache.set(`${card.id}:${lang}`, card);
      }
    }
    return cards;
  }

  /**
   * Get exact card by its unique Card ID with request deduplication & memory cache
   */
  public static async getCardById(cardId: string, lang: CardLanguage = this.defaultLanguage): Promise<PokemonCard | null> {
    if (!cardId) return null;

    const cacheKey = `${cardId}:${lang}`;
    if (this.memoryCardCache.has(cacheKey)) {
      return this.memoryCardCache.get(cacheKey)!;
    }

    if (this.inFlightCardRequests.has(cacheKey)) {
      return this.inFlightCardRequests.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        // Check set-based card lookup first
        const parts = cardId.split('-');
        if (parts.length > 1) {
          const setId = parts[0];
          const setCards = await this.getCardsBySet(setId, lang);
          const foundInSet = setCards.find((c) => c.id === cardId);
          if (foundInSet) {
            this.memoryCardCache.set(cacheKey, foundInSet);
            return foundInSet;
          }
        }

        // Direct API fallback
        const card = await apiFetchCardById(cardId, lang);
        if (card) {
          this.memoryCardCache.set(cacheKey, card);
        }
        return card;
      } finally {
        this.inFlightCardRequests.delete(cacheKey);
      }
    })();

    this.inFlightCardRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Search cards across ALL expansions in the entire catalog
   */
  public static async searchCards(
    options: CatalogFilterOptions,
    lang: CardLanguage = this.defaultLanguage
  ): Promise<{ cards: PokemonCard[]; total: number }> {
    const {
      searchQuery,
      setId,
      series,
      type,
      rarity,
      artist,
      sortBy = 'number',
      sortOrder = 'asc',
    } = options;

    let targetCards: PokemonCard[] = [];

    if (setId) {
      targetCards = await this.getCardsBySet(setId, lang);
    } else {
      // Search across ALL available expansions in the synced catalog
      const sets = await this.getSets(lang);

      // Filter by series if requested
      const filteredSets = series
        ? sets.filter((s) => s.series?.toLowerCase().includes(series.toLowerCase()))
        : sets;

      // Batch load cards across sets
      const cardsPromises = filteredSets.map((s) => this.getCardsBySet(s.id, lang));
      const nested = await Promise.all(cardsPromises);
      targetCards = nested.flat();
    }

    // Apply text search filters
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();

      targetCards = targetCards.filter((card) => {
        const nameMatch = card.name.toLowerCase().includes(q);
        const numberMatch =
          card.localId.toLowerCase() === q ||
          card.localId.toLowerCase().startsWith(q) ||
          `${card.localId}/${card.setTotalCards}`.toLowerCase() === q;
        const setMatch =
          card.setName.toLowerCase().includes(q) ||
          card.setId.toLowerCase().includes(q) ||
          card.setCode?.toLowerCase().includes(q);
        const artistMatch = card.illustrator?.toLowerCase().includes(q);
        const typeMatch = card.types?.some((t) => t.toLowerCase().includes(q));

        return nameMatch || numberMatch || setMatch || artistMatch || typeMatch;
      });
    }

    // Apply strict filters
    if (type) {
      targetCards = targetCards.filter((c) => c.types?.some((t) => t.toLowerCase() === type.toLowerCase()));
    }

    if (rarity) {
      targetCards = targetCards.filter((c) => c.rarity?.toLowerCase().includes(rarity.toLowerCase()));
    }

    if (artist) {
      targetCards = targetCards.filter((c) => c.illustrator?.toLowerCase().includes(artist.toLowerCase()));
    }

    // Sort cards
    targetCards.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'number') {
        comparison = parseCardNumber(a.localId) - parseCardNumber(b.localId);
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'rarity') {
        comparison = (a.rarity || '').localeCompare(b.rarity || '');
      } else if (sortBy === 'set') {
        comparison = a.setName.localeCompare(b.setName);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return {
      cards: targetCards,
      total: targetCards.length,
    };
  }

  /**
   * Get bulk cards by multiple card IDs (for decks & collection views)
   */
  public static async getCardsByIds(
    cardIds: string[],
    lang: CardLanguage = this.defaultLanguage
  ): Promise<Record<string, PokemonCard>> {
    const result: Record<string, PokemonCard> = {};
    const uniqueIds = Array.from(new Set(cardIds)).filter(Boolean);

    const promises = uniqueIds.map(async (id) => {
      const card = await this.getCardById(id, lang);
      if (card) {
        result[id] = card;
      }
    });

    await Promise.all(promises);
    return result;
  }
}
