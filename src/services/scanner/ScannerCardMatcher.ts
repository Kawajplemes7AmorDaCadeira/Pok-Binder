import { CardLanguage, CardVariant, PokemonCard } from '../../types';
import { CardProvider } from '../cardProvider';
import { CardCandidate, CardMatchBreakdown, ExtractedCardTokens } from './types';

export class ScannerCardMatcher {
  /**
   * Calculates Levenshtein distance between two strings for fuzzy matching.
   */
  private static levenshtein(a: string, b: string): number {
    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();
    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[s1.length][s2.length];
  }

  /**
   * Calculates similarity score (0 - 1) between two strings.
   */
  public static stringSimilarity(a: string, b: string): number {
    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;

    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    const distance = this.levenshtein(s1, s2);
    return Math.max(0, 1 - distance / maxLen);
  }

  /**
   * Evaluates and scores a single PokemonCard against extracted OCR tokens.
   */
  public static scoreCard(
    card: PokemonCard,
    tokens: ExtractedCardTokens,
    preferredLanguage: CardLanguage
  ): { breakdown: CardMatchBreakdown; reasons: string[] } {
    let numberScore = 0;
    let nameScore = 0;
    let setScore = 0;
    let languageScore = 0;
    let hpScore = 0;
    const reasons: string[] = [];

    const localIdClean = (card.localId || '').trim();
    const localIdNoZeros = localIdClean.replace(/^0+/, '');

    // 1. Collector Number Match (+45 max)
    for (const num of tokens.collectorNumbers) {
      if (num.includes('/')) {
        const [left, right] = num.split('/');
        const leftNoZeros = left.replace(/^0+/, '');

        // Exact match with localId (e.g. "010" in "010/086" or "010/086" as localId)
        if (
          localIdClean === left ||
          localIdClean === leftNoZeros ||
          localIdClean === num
        ) {
          numberScore = 45;
          reasons.push(`Número exato #${card.localId} detectado`);
          break;
        }

        // Partial match
        if (localIdClean.includes(leftNoZeros) || leftNoZeros === localIdClean) {
          numberScore = Math.max(numberScore, 35);
          reasons.push(`Número parcial #${left} correspondente`);
        }
      } else {
        // Standalone number
        const numNoZeros = num.replace(/^0+/, '');
        if (localIdClean === num || localIdClean === numNoZeros || localIdNoZeros === numNoZeros) {
          numberScore = Math.max(numberScore, 40);
          reasons.push(`Número #${card.localId} identificado`);
          break;
        }
      }
    }

    // 2. Name Match (+25 max)
    let bestNameSim = 0;
    let matchedNameStr = '';
    for (const cand of tokens.nameCandidates) {
      const sim = this.stringSimilarity(card.name, cand);
      if (sim > bestNameSim) {
        bestNameSim = sim;
        matchedNameStr = cand;
      }
    }

    if (bestNameSim >= 0.95) {
      nameScore = 25;
      reasons.push(`Nome exato "${card.name}"`);
    } else if (bestNameSim >= 0.75) {
      nameScore = Math.round(25 * bestNameSim);
      reasons.push(`Nome aproximado "${matchedNameStr}" ~ "${card.name}"`);
    } else if (bestNameSim >= 0.5) {
      nameScore = Math.round(15 * bestNameSim);
    }

    // 3. Set Match (+20 max)
    const setNameLower = (card.setName || '').toLowerCase();
    const setCodeLower = (card.setCode || card.setId || '').toLowerCase();

    for (const hint of tokens.setHints) {
      const hLower = hint.toLowerCase();
      if (setCodeLower.includes(hLower) || hLower.includes(setCodeLower)) {
        setScore = 20;
        reasons.push(`Código de Expansão "${card.setName}" detectado`);
        break;
      }
    }

    if (setScore === 0) {
      // Check if full bottom text includes set name
      for (const cand of tokens.nameCandidates) {
        if (cand.length >= 4 && setNameLower.includes(cand.toLowerCase())) {
          setScore = 15;
          reasons.push(`Expansão compatível "${card.setName}"`);
          break;
        }
      }
    }

    // Also check total card count in slash format (e.g. "/086" vs set official total)
    if (setScore < 20) {
      for (const num of tokens.collectorNumbers) {
        if (num.includes('/')) {
          const totalInCard = parseInt(num.split('/')[1], 10);
          if (
            totalInCard &&
            card.setTotalCards &&
            Math.abs(card.setTotalCards - totalInCard) <= 2
          ) {
            setScore = Math.max(setScore, 18);
            reasons.push(`Total da coleção (/ ${totalInCard}) compatível`);
            break;
          }
        }
      }
    }

    // 4. Language Match (+5 max)
    if (card.language === preferredLanguage) {
      languageScore = 5;
    }

    // 5. HP Match (+5 max)
    if (card.hp && tokens.hpCandidates.length > 0) {
      if (tokens.hpCandidates.includes(card.hp)) {
        hpScore = 5;
        reasons.push(`HP ${card.hp} confirmado`);
      }
    }

    const total = numberScore + nameScore + setScore + languageScore + hpScore;

    return {
      breakdown: {
        numberMatch: numberScore,
        nameMatch: nameScore,
        setMatch: setScore,
        languageMatch: languageScore,
        hpMatch: hpScore,
        total: Math.min(100, total),
      },
      reasons,
    };
  }

  /**
   * Queries catalog for potential cards and ranks candidates by confidence score.
   */
  public static async findCardCandidates(
    tokens: ExtractedCardTokens,
    preferredLanguage: CardLanguage
  ): Promise<CardCandidate[]> {
    const candidateMap = new Map<string, PokemonCard>();

    // Step 1: Search by Collector Numbers (Highest priority)
    for (const num of tokens.collectorNumbers) {
      const cleanNum = num.includes('/') ? num.split('/')[0].replace(/^0+/, '') : num.replace(/^0+/, '');
      if (cleanNum) {
        const { cards } = await CardProvider.searchCards(
          { searchQuery: cleanNum, sortBy: 'number' },
          preferredLanguage
        );
        for (const card of cards) {
          candidateMap.set(card.id, card);
        }
      }
    }

    // Step 2: Search by Name Candidates
    for (const name of tokens.nameCandidates.slice(0, 4)) {
      if (name.length >= 3) {
        const { cards } = await CardProvider.searchCards(
          { searchQuery: name },
          preferredLanguage
        );
        for (const card of cards.slice(0, 10)) {
          candidateMap.set(card.id, card);
        }
      }
    }

    // If still empty and raw numbers exist
    if (candidateMap.size === 0 && tokens.rawNumbers.length > 0) {
      for (const raw of tokens.rawNumbers) {
        const { cards } = await CardProvider.searchCards(
          { searchQuery: raw },
          preferredLanguage
        );
        for (const card of cards.slice(0, 8)) {
          candidateMap.set(card.id, card);
        }
      }
    }

    const allCards = Array.from(candidateMap.values());
    const scoredCandidates: CardCandidate[] = [];

    for (const card of allCards) {
      const { breakdown, reasons } = this.scoreCard(card, tokens, preferredLanguage);
      scoredCandidates.push({
        card,
        confidence: breakdown.total,
        matchBreakdown: breakdown,
        reasons,
      });
    }

    // Sort by confidence descending
    scoredCandidates.sort((a, b) => b.confidence - a.confidence);

    return scoredCandidates;
  }

  /**
   * Suggests likely card variant based on card rarity and attributes.
   */
  public static suggestProbableVariant(card: PokemonCard): {
    variant: CardVariant;
    confidence: number;
  } {
    const rarity = (card.rarity || '').toLowerCase();
    const name = card.name.toLowerCase();

    if (
      rarity.includes('secret') ||
      rarity.includes('ultra') ||
      rarity.includes('illustration') ||
      rarity.includes('hyper') ||
      rarity.includes('special') ||
      name.includes(' ex') ||
      name.includes(' vstar') ||
      name.includes(' vmax') ||
      name.includes(' v')
    ) {
      return { variant: 'holo', confidence: 85 };
    }

    if (rarity.includes('holo') || rarity.includes('rare holo')) {
      return { variant: 'holo', confidence: 75 };
    }

    return { variant: 'normal', confidence: 90 };
  }
}
