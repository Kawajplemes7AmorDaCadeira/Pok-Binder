import { CardProvider } from '../../services/cardProvider';
import { CardLanguage } from '../../types';
import { DeckValidator } from '../../lib/deckValidator';
import { CARD_TRANSLATIONS, ROTATION_SUBSTITUTIONS } from '../config/rotation';

export interface CardToResolve {
  name: string;
  quantity: number;
  category?: string;
  specificNumber?: string;
  specificType?: string;
  specificHp?: string;
  specificSet?: string;
}

export class CardResolverService {
  public static async resolveCard(
    card: CardToResolve,
    targetFormat: string,
    lang: CardLanguage
  ): Promise<{ resolved: boolean; cardId: string; meta: any }> {
    let searchQuery = card.name;
    const nameLower = card.name.toLowerCase();

    // 1. Check English-to-Portuguese translations for trainers and energies
    if (lang === 'pt' && CARD_TRANSLATIONS[nameLower]) {
      searchQuery = CARD_TRANSLATIONS[nameLower];
    }

    // 1b. Substitution for out-of-rotation cards (Standard & Rotation formats only)
    if (targetFormat === 'Standard' || targetFormat === 'Rotation') {
      const checkQuery = searchQuery.toLowerCase().trim();
      if (ROTATION_SUBSTITUTIONS[checkQuery]) {
        searchQuery = ROTATION_SUBSTITUTIONS[checkQuery];
        card.name = searchQuery; // update the card name reference too
      }
    }

    // Query database via CardProvider
    let searchResult = await CardProvider.searchCards({ searchQuery }, lang);

    // 2. If 0 results, let's try fuzzy match (like removing ' ex' or searching for base name)
    if (searchResult.cards.length === 0 && lang === 'pt') {
      if (searchQuery.toLowerCase().endsWith(' ex')) {
        const baseName = searchQuery.slice(0, -3);
        const backupRes = await CardProvider.searchCards({ searchQuery: baseName }, lang);
        if (backupRes.cards.length > 0) {
          searchResult = backupRes;
        }
      }
    }

    // 3. Smart Basic Energy matching
    if (searchResult.cards.length === 0 && (card.category === 'Energy' || nameLower.includes('energy') || nameLower.includes('energia'))) {
      let typeMatch = 'Colorless';
      if (nameLower.includes('fire') || nameLower.includes('fogo')) typeMatch = 'Fire';
      else if (nameLower.includes('water') || nameLower.includes('água') || nameLower.includes('agua')) typeMatch = 'Water';
      else if (nameLower.includes('grass') || nameLower.includes('planta') || nameLower.includes('folha') || nameLower.includes('leaf')) typeMatch = 'Grass';
      else if (nameLower.includes('lightning') || nameLower.includes('raio') || nameLower.includes('elétrico') || nameLower.includes('eletrico')) typeMatch = 'Lightning';
      else if (nameLower.includes('psychic') || nameLower.includes('psíquico') || nameLower.includes('psiquico')) typeMatch = 'Psychic';
      else if (nameLower.includes('fighting') || nameLower.includes('luta')) typeMatch = 'Fighting';
      else if (nameLower.includes('dark') || nameLower.includes('sombrio')) typeMatch = 'Darkness';
      else if (nameLower.includes('metal') || nameLower.includes('aço')) typeMatch = 'Metal';
      else if (nameLower.includes('dragon') || nameLower.includes('dragão') || nameLower.includes('dragao')) typeMatch = 'Dragon';

      const allEnergies = await CardProvider.searchCards({ type: typeMatch }, lang);
      const energyCards = allEnergies.cards.filter(c => c.category === 'Energy');
      if (energyCards.length > 0) {
        searchResult = { cards: [energyCards[0]], total: 1 };
      }
    }

    // 4. Try searching by first word if still 0 matches (for minor spelling/naming deviations)
    if (searchResult.cards.length === 0) {
      const words = searchQuery.split(' ').filter(w => w.length > 2 && w.toLowerCase() !== 'the' && w.toLowerCase() !== 'and' && w.toLowerCase() !== 'basic' && w.toLowerCase() !== 'básica' && w.toLowerCase() !== 'basica');
      if (words.length > 0) {
        const firstWord = words[0];
        const backupRes = await CardProvider.searchCards({ searchQuery: firstWord }, lang);
        if (backupRes.cards.length > 0) {
          const catLower = (card.category || '').toLowerCase();
          const catMatches = backupRes.cards.filter(c => (c.category || '').toLowerCase() === catLower);
          if (catMatches.length > 0) {
            searchResult = { cards: catMatches, total: catMatches.length };
          } else {
            searchResult = backupRes;
          }
        }
      }
    }

    let matchedCard: any = null;
    if (searchResult.cards.length > 0) {
      const queryLower = searchQuery.toLowerCase();
      const catLower = (card.category || '').toLowerCase();

      // Scoring each candidate card based on specific user criteria
      const getCandidateScore = (c: any) => {
        let score = 0;

        // 1. Check Specific card number (e.g., '074/132', '074', '74')
        if (card.specificNumber) {
          const specNum = String(card.specificNumber).toLowerCase().trim();
          const cardNumPart = (c.localId || '').toLowerCase().trim();
          const fullCardNum = `${c.localId}/${c.setTotalCards}`.toLowerCase();
          if (cardNumPart === specNum || cardNumPart === specNum.padStart(3, '0') || specNum.startsWith(cardNumPart) || fullCardNum === specNum || specNum.includes(cardNumPart)) {
            score += 1000;
          }
        }

        // 2. Check Specific Type (e.g. 'Fighting', 'Psychic', 'Luta', 'Guerreiro')
        if (card.specificType) {
          const specType = String(card.specificType).toLowerCase().trim();
          const cardTypes = (c.types || []).map((t: string) => t.toLowerCase());
          const isFightingSearch = specType.includes('guer') || specType.includes('lut') || specType.includes('fight') || specType.includes('stone') || specType.includes('pedra');
          const isPsychicSearch = specType.includes('psi') || specType.includes('psy');
          
          if (isFightingSearch && cardTypes.some((t: string) => t === 'fighting' || t === 'luta')) {
            score += 500;
          } else if (isPsychicSearch && cardTypes.some((t: string) => t === 'psychic' || t === 'psíquico' || t === 'psiquico')) {
            score += 500;
          } else if (cardTypes.some((t: string) => t.includes(specType) || specType.includes(t))) {
            score += 400;
          }
        }

        // 3. Check Specific HP (e.g. '110', '90')
        if (card.specificHp) {
          const specHp = String(card.specificHp).replace(/\D/g, '');
          const cardHp = String(c.hp || '').replace(/\D/g, '');
          if (specHp && cardHp && specHp === cardHp) {
            score += 300;
          }
        }

        // 4. Check Specific Set Name/Series (e.g. 'Astral Radiance', 'Crown Zenith', 'Obsidian Flames')
        if (card.specificSet) {
          const specSet = String(card.specificSet).toLowerCase();
          const cardSetName = (c.setName || '').toLowerCase();
          const cardSetId = (c.setId || '').toLowerCase();
          if (cardSetName.includes(specSet) || specSet.includes(cardSetName) || cardSetId.includes(specSet)) {
            score += 200;
          }
        }

        // 5. Standard rotation ranking (tie-breaker)
        const isStdLegal = DeckValidator.isStandardLegal(c);
        if ((targetFormat === 'Standard' || targetFormat === 'Rotation') && !isStdLegal) {
          score -= 10000;
        }

        const setId = (c.setId || '').toLowerCase();
        const mark = (c.regulationMark || '').toUpperCase();
        if (setId.startsWith('sv')) score += 3;
        else if (['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].includes(mark)) score += 2;
        else score += 1;

        return score;
      };

      // Sort candidates by total score
      const sortedCandidates = [...searchResult.cards].sort((a, b) => getCandidateScore(b) - getCandidateScore(a));

      // Exact name match
      const matches = sortedCandidates.filter(c => c.name.toLowerCase() === queryLower);

      if (matches.length > 0) {
        const withCat = matches.filter(c => (c.category || '').toLowerCase() === catLower);
        matchedCard = withCat.length > 0 ? withCat[0] : matches[0];
      } else {
        // Partial match
        const partialMatches = sortedCandidates.filter(c => c.name.toLowerCase().includes(queryLower) || queryLower.includes(c.name.toLowerCase()));
        matchedCard = partialMatches.length > 0 ? partialMatches[0] : sortedCandidates[0];
      }
    }

    if (matchedCard) {
      return {
        resolved: true,
        cardId: matchedCard.id,
        meta: matchedCard,
      };
    }

    // Fallback mockup / unresolved card
    const tempId = `temp-${card.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    return {
      resolved: false,
      cardId: tempId,
      meta: {
        id: tempId,
        name: card.name,
        category: card.category || 'Trainer',
        setName: 'AI Suggestion',
        setId: 'ai',
        localId: '?',
        language: lang,
        rules: ['Esta carta não pôde ser mapeada diretamente no catálogo local, mas faz parte da sugestão da IA.'],
      },
    };
  }
}
