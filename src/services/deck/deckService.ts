import { DeckRepository } from '../../database/repositories/DeckRepository';
import { CollectionRepository } from '../../database/repositories/CollectionRepository';
import { DeckEntity } from '../../types/db';
import { generateUUID } from '../../database/idUtils';
import { DeckFormat } from '../../types';

export interface DeckValidationRuleResult {
  isValid: boolean;
  totalCards: number;
  errors: string[];
  warnings: string[];
}

export interface DeckCollectionAvailability {
  isFullyOwned: boolean;
  totalNeeded: number;
  totalOwnedInDeck: number;
  missingCards: Array<{
    cardPrintId: string;
    needed: number;
    owned: number;
    missingQuantity: number;
  }>;
}

export interface DeckStats {
  totalCards: number;
  pokemonCount: number;
  trainerCount: number;
  energyCount: number;
  typeDistribution: Record<string, number>;
  energyDistribution: Record<string, number>;
}

export class DeckService {
  /**
   * Get all active decks
   */
  public static async getDecks(): Promise<DeckEntity[]> {
    return DeckRepository.getAll();
  }

  /**
   * Get deck by ID
   */
  public static async getDeckById(id: string): Promise<DeckEntity | undefined> {
    return DeckRepository.getById(id);
  }

  /**
   * Save or update deck
   */
  public static async saveDeck(deckData: Partial<DeckEntity> & { name: string }): Promise<DeckEntity> {
    const entity: DeckEntity = {
      id: deckData.id || generateUUID(),
      name: deckData.name,
      description: deckData.description || '',
      format: deckData.format || 'Standard',
      coverCardPrintId: deckData.coverCardPrintId,
      cards: deckData.cards || [],
      createdAt: deckData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await DeckRepository.save(entity);
    return entity;
  }

  /**
   * Duplicate existing deck
   */
  public static async duplicateDeck(id: string): Promise<DeckEntity | null> {
    const existing = await DeckRepository.getById(id);
    if (!existing) return null;

    const copy: DeckEntity = {
      ...existing,
      id: generateUUID(),
      name: `${existing.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await DeckRepository.save(copy);
    return copy;
  }

  /**
   * Delete deck
   */
  public static async deleteDeck(id: string): Promise<boolean> {
    await DeckRepository.delete(id);
    return true;
  }

  /**
   * Validate deck against format rules
   */
  public static validateDeck(
    deck: DeckEntity,
    cardMetaMap?: Record<string, { name: string; supertype?: string; subtype?: string; isBasicEnergy?: boolean }>
  ): DeckValidationRuleResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const totalCards = deck.cards.reduce((sum, c) => sum + c.quantity, 0);

    // Rule 1: Deck size requirement (Standard format usually requires exactly 60 cards)
    if (totalCards !== 60) {
      if (totalCards < 60) {
        warnings.push(`O baralho possui ${totalCards} de 60 cartas.`);
      } else {
        errors.push(`O baralho excede o limite de 60 cartas (atual: ${totalCards}).`);
      }
    }

    // Rule 2: 4-copy rule limit (except basic energies)
    const copiesByName = new Map<string, number>();
    let aceSpecCount = 0;
    let radiantCount = 0;

    deck.cards.forEach((item) => {
      const meta = cardMetaMap ? cardMetaMap[item.cardPrintId] : undefined;
      const cardName = meta ? meta.name : item.cardPrintId;
      const isBasicEnergy =
        meta && meta.isBasicEnergy !== undefined
          ? meta.isBasicEnergy
          : cardName.toLowerCase().includes('basic energy') || cardName.toLowerCase().includes('energia básica');

      if (!isBasicEnergy) {
        const currentCopies = copiesByName.get(cardName.toLowerCase()) || 0;
        const newCopies = currentCopies + item.quantity;
        copiesByName.set(cardName.toLowerCase(), newCopies);

        if (newCopies > 4) {
          errors.push(`A carta '${cardName}' possui ${newCopies} cópias (máximo permitido: 4).`);
        }
      }

      // Check ACE SPEC or Radiant limit
      if (cardName.toUpperCase().includes('ACE SPEC') || meta?.subtype?.toUpperCase().includes('ACE SPEC')) {
        aceSpecCount += item.quantity;
      }
      if (cardName.toLowerCase().includes('radiant ') || meta?.subtype?.toLowerCase().includes('radiant')) {
        radiantCount += item.quantity;
      }
    });

    if (aceSpecCount > 1) {
      errors.push(`O baralho possui ${aceSpecCount} cartas ACE SPEC (máximo permitido: 1).`);
    }

    if (radiantCount > 1) {
      errors.push(`O baralho possui ${radiantCount} Pokémon Radiosos (máximo permitido: 1).`);
    }

    return {
      isValid: errors.length === 0,
      totalCards,
      errors,
      warnings,
    };
  }

  /**
   * Check deck card availability against collection
   */
  public static async checkCollectionAvailability(deck: DeckEntity): Promise<DeckCollectionAvailability> {
    const collection = await CollectionRepository.getAll();

    // Map total owned quantity per cardPrintId or card base ID
    const ownedMap = new Map<string, number>();
    collection.forEach((item) => {
      if (!item.deletedAt && item.quantity > 0) {
        const current = ownedMap.get(item.cardPrintId) || 0;
        ownedMap.set(item.cardPrintId, current + item.quantity);
      }
    });

    let totalNeeded = 0;
    let totalOwnedInDeck = 0;
    const missingCards: DeckCollectionAvailability['missingCards'] = [];

    deck.cards.forEach((c) => {
      totalNeeded += c.quantity;
      const owned = ownedMap.get(c.cardPrintId) || 0;
      const usable = Math.min(c.quantity, owned);
      totalOwnedInDeck += usable;

      if (owned < c.quantity) {
        missingCards.push({
          cardPrintId: c.cardPrintId,
          needed: c.quantity,
          owned,
          missingQuantity: c.quantity - owned,
        });
      }
    });

    return {
      isFullyOwned: missingCards.length === 0,
      totalNeeded,
      totalOwnedInDeck,
      missingCards,
    };
  }

  /**
   * Calculate deck statistics (categories, types, energy balance)
   */
  public static calculateDeckStats(
    deck: DeckEntity,
    cardMetaMap?: Record<string, { supertype?: string; types?: string[]; isBasicEnergy?: boolean }>
  ): DeckStats {
    let pokemonCount = 0;
    let trainerCount = 0;
    let energyCount = 0;
    const typeDistribution: Record<string, number> = {};
    const energyDistribution: Record<string, number> = {};

    let totalCards = 0;

    deck.cards.forEach((item) => {
      totalCards += item.quantity;
      const meta = cardMetaMap ? cardMetaMap[item.cardPrintId] : undefined;
      const supertype = (meta?.supertype || '').toLowerCase();

      if (supertype.includes('pokémon') || supertype.includes('pokemon')) {
        pokemonCount += item.quantity;
        if (meta?.types && Array.isArray(meta.types)) {
          meta.types.forEach((t) => {
            typeDistribution[t] = (typeDistribution[t] || 0) + item.quantity;
          });
        }
      } else if (supertype.includes('trainer') || supertype.includes('treinador')) {
        trainerCount += item.quantity;
      } else if (supertype.includes('energy') || supertype.includes('energia')) {
        energyCount += item.quantity;
        energyDistribution[supertype] = (energyDistribution[supertype] || 0) + item.quantity;
      } else {
        // Default heuristics based on ID or fallback
        pokemonCount += item.quantity;
      }
    });

    return {
      totalCards,
      pokemonCount,
      trainerCount,
      energyCount,
      typeDistribution,
      energyDistribution,
    };
  }
}
