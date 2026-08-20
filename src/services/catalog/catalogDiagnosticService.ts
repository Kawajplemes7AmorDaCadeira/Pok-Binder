import { CardLanguage, CardSet, PokemonCard } from '../../types';
import { CardRepository } from '../../database/repositories/CardRepository';
import { SetRepository } from '../../database/repositories/SetRepository';

export interface CardValidationIssue {
  cardId: string;
  setId: string;
  collectorNumber: string;
  issueType: 'missing_image' | 'missing_field' | 'duplicate_id' | 'duplicate_number' | 'broken_relation';
  message: string;
}

export interface DiagnosticReport {
  totalSetsFound: number;
  totalSetsValid: number;
  emptySetsCount: number;
  totalCardsFound: number;
  cardsWithImages: number;
  cardsMissingImages: number;
  duplicateCardIdsCount: number;
  duplicateCollectorNumbersCount: number;
  cardsMissingFieldsCount: number;
  brokenRelationsCount: number;
  lastUpdatedTimestamp: string;
  issues: CardValidationIssue[];
}

export class CatalogDiagnosticService {
  /**
   * Validate card image relation: Card ID + Set + Collector Number + Image URL
   */
  public static validateCardImageRelation(card: PokemonCard): boolean {
    if (!card.image) return false;
    if (!card.id || !card.setId || !card.localId) return false;
    return typeof card.image === 'string' && card.image.startsWith('http');
  }

  /**
   * Validate a single card for missing required fields
   */
  public static validateCard(card: PokemonCard): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];
    if (!card.id) missingFields.push('id');
    if (!card.name) missingFields.push('name');
    if (!card.setId) missingFields.push('setId');
    if (!card.localId) missingFields.push('localId');

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Check for duplicate collector numbers within a set
   */
  public static checkDuplicateCollectorNumbers(cards: PokemonCard[]): string[] {
    const seenNumbers = new Map<string, string>();
    const duplicates: string[] = [];

    cards.forEach((card) => {
      const numKey = (card.localId || '').trim().toLowerCase();
      if (numKey) {
        if (seenNumbers.has(numKey)) {
          duplicates.push(`Número de coletor duplicado #${card.localId}: ${seenNumbers.get(numKey)} e ${card.id}`);
        } else {
          seenNumbers.set(numKey, card.id);
        }
      }
    });

    return duplicates;
  }

  /**
   * Check for duplicate Card IDs within a set
   */
  public static checkDuplicateCards(cards: PokemonCard[]): string[] {
    const seenIds = new Set<string>();
    const duplicates: string[] = [];

    cards.forEach((card) => {
      if (seenIds.has(card.id)) {
        duplicates.push(`ID de carta duplicado: ${card.id}`);
      }
      seenIds.add(card.id);
    });

    return duplicates;
  }

  /**
   * Check missing required fields across a card list
   */
  public static checkMissingFields(cards: PokemonCard[]): CardValidationIssue[] {
    const issues: CardValidationIssue[] = [];

    cards.forEach((card) => {
      const { isValid, missingFields } = this.validateCard(card);
      if (!isValid) {
        issues.push({
          cardId: card.id,
          setId: card.setId,
          collectorNumber: card.localId || 'N/A',
          issueType: 'missing_field',
          message: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`,
        });
      }
    });

    return issues;
  }

  /**
   * Check for broken relations between card and set metadata
   */
  public static checkBrokenRelations(cards: PokemonCard[], setMeta: CardSet): CardValidationIssue[] {
    const issues: CardValidationIssue[] = [];

    cards.forEach((card) => {
      if (card.setId.toLowerCase() !== setMeta.id.toLowerCase() && !setMeta.id.toLowerCase().includes(card.setId.toLowerCase())) {
        issues.push({
          cardId: card.id,
          setId: card.setId,
          collectorNumber: card.localId || 'N/A',
          issueType: 'broken_relation',
          message: `Relação quebrada: Carta pertence a '${card.setId}', mas a expansão atual é '${setMeta.id}'`,
        });
      }
    });

    return issues;
  }

  /**
   * Generate comprehensive health report for a set
   */
  public static analyzeSet(setMeta: CardSet, cards: PokemonCard[]) {
    const missingImagesCount = cards.filter((c) => !this.validateCardImageRelation(c)).length;
    const dupIds = this.checkDuplicateCards(cards);
    const dupNums = this.checkDuplicateCollectorNumbers(cards);
    const missingFields = this.checkMissingFields(cards);
    const brokenRelations = this.checkBrokenRelations(cards, setMeta);

    const isValid =
      cards.length > 0 &&
      dupIds.length === 0 &&
      dupNums.length === 0 &&
      missingFields.length === 0 &&
      brokenRelations.length === 0;

    return {
      setId: setMeta.id,
      setName: setMeta.name,
      totalCards: cards.length,
      missingImagesCount,
      duplicateIdsCount: dupIds.length,
      duplicateCollectorNumbersCount: dupNums.length,
      missingFieldsCount: missingFields.length,
      brokenRelationsCount: brokenRelations.length,
      isValid,
    };
  }
}
