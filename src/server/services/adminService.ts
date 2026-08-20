import { CardProvider } from '../../services/cardProvider';
import { CardLanguage } from '../../types';

export class AdminService {
  public static async validateCatalog(setId = 'sv03.5', lang: CardLanguage = 'pt') {
    const cards = await CardProvider.getCardsBySet(setId, lang);

    let missingImages = 0;
    let missingNumbers = 0;
    let missingSetInfo = 0;
    const seenIds = new Set<string>();
    const duplicateIds: string[] = [];
    const inconsistentRecords: string[] = [];

    cards.forEach((card) => {
      if (!card.image) missingImages++;
      if (!card.localId) missingNumbers++;
      if (!card.setId || !card.setName) missingSetInfo++;

      if (seenIds.has(card.id)) {
        duplicateIds.push(card.id);
      } else {
        seenIds.add(card.id);
      }

      if (!card.name || !card.localId) {
        inconsistentRecords.push(`Card ${card.id} lacks name or localId`);
      }
    });

    return {
      setId,
      totalCardsTested: cards.length,
      missingImages,
      missingNumbers,
      missingSetInfo,
      duplicateIds,
      inconsistentRecords,
      timestamp: new Date().toISOString(),
    };
  }
}
