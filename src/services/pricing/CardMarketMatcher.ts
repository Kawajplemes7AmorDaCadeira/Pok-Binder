import { CardVariant, PokemonCard } from '../../types';

export interface MatchCandidate {
  name: string;
  setName?: string;
  setId?: string;
  localId?: string;
  variant?: string;
}

export class CardMarketMatcher {
  /**
   * Compute confidence score between 0 and 100 for a card match
   */
  public static computeConfidenceScore(
    candidate: MatchCandidate,
    target: PokemonCard,
    targetVariant: CardVariant
  ): { score: number; matchDetails: string; isConfident: boolean } {
    let score = 0;
    const details: string[] = [];

    // Parse Liga Pokémon format if candidate.name is "Bulbasaur (001/165)"
    let rawCandName = candidate.name || '';
    let extractedCandNum = candidate.localId || '';

    const parenMatch = rawCandName.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (parenMatch) {
      rawCandName = parenMatch[1].trim();
      if (!extractedCandNum) {
        extractedCandNum = parenMatch[2].trim();
      }
    }

    const targetNameNorm = (target.name || '').trim().toLowerCase();
    const candNameNorm = rawCandName.trim().toLowerCase();

    // 1. Name Match (Up to 40 pts)
    if (targetNameNorm && candNameNorm) {
      if (targetNameNorm === candNameNorm) {
        score += 40;
        details.push('Nome idêntico (+40)');
      } else if (candNameNorm.includes(targetNameNorm) || targetNameNorm.includes(candNameNorm)) {
        score += 25;
        details.push('Nome aproximado (+25)');
      }
    }

    // 2. Set ID / Set Name Match (Up to 25 pts)
    const targetSet = (target.setName || target.setId || '').trim().toLowerCase();
    const candSet = (candidate.setName || candidate.setId || '').trim().toLowerCase();
    if (targetSet && candSet) {
      if (
        targetSet === candSet ||
        candSet.includes(targetSet) ||
        targetSet.includes(candSet) ||
        (target.setId && candSet.includes(target.setId.toLowerCase()))
      ) {
        score += 25;
        details.push('Coleção correspondente (+25)');
      }
    }

    // 3. Collector Number Match (Up to 25 pts)
    const targetNum = (target.localId || '').trim().toLowerCase();
    const candNum = extractedCandNum.trim().toLowerCase();
    if (targetNum && candNum) {
      const cleanTarget = targetNum.replace(/^0+/, '').split('/')[0];
      const cleanCand = candNum.replace(/^0+/, '').split('/')[0];

      if (cleanTarget === cleanCand || targetNum === candNum || candNum.includes(cleanTarget)) {
        score += 25;
        details.push('Número idêntico (+25)');
      }
    }

    // 4. Variant Match (Up to 10 pts)
    const candVariant = (candidate.variant || '').toLowerCase();
    const targetVarNorm = (targetVariant || 'normal').toLowerCase();
    if (
      candVariant === targetVarNorm ||
      (targetVarNorm === 'normal' && (!candVariant || candVariant.includes('normal') || candVariant.includes('regular'))) ||
      (targetVarNorm === 'holo' && (candVariant.includes('holo') || candVariant.includes('foil'))) ||
      (targetVarNorm === 'reverse' && (candVariant.includes('reverse') || candVariant.includes('reversa')))
    ) {
      score += 10;
      details.push('Variante compatível (+10)');
    }

    const isConfident = score >= 60;

    return {
      score,
      matchDetails: details.join(' • '),
      isConfident,
    };
  }
}
