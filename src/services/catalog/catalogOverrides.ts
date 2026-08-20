import { PokemonCard } from '../../types';

export interface CatalogOverride {
  setId: string;
  correctedName?: string;
  correctedCode?: string;
  releaseDateOverride?: string;
  seriesOverride?: string;
  hidden?: boolean;
  notes?: string;
}

/**
 * Catalog Overrides table to fine-tune remote API set metadata dynamically.
 */
export const CATALOG_OVERRIDES: Record<string, CatalogOverride> = {
  me05: {
    setId: 'me05',
    correctedName: 'Megaevolução — Caos Ascendente',
    releaseDateOverride: '2026-06-12',
    seriesOverride: 'Megaevolução',
  },
  me04: {
    setId: 'me04',
    correctedName: 'Megaevolução — Equilíbrio Perfeito',
    releaseDateOverride: '2026-03-27',
    seriesOverride: 'Megaevolução',
  },
  me03: {
    setId: 'me03',
    correctedName: 'Megaevolução — Heróis Excelsos',
    releaseDateOverride: '2026-01-16',
    seriesOverride: 'Megaevolução',
  },
  me02: {
    setId: 'me02',
    correctedName: 'Megaevolução — Fogo Fantasmagórico',
    releaseDateOverride: '2025-09-19',
    seriesOverride: 'Megaevolução',
  },
  me01: {
    setId: 'me01',
    correctedName: 'Megaevolução',
    releaseDateOverride: '2025-05-23',
    seriesOverride: 'Megaevolução',
  },
  'sv09.5': {
    setId: 'sv09.5',
    correctedName: 'Rivais Predestinados (Equipe Rocket)',
    releaseDateOverride: '2025-03-28',
    seriesOverride: 'Escarlate e Violeta',
  },
};

/**
 * Applies catalog overrides to a list of sets.
 */
export function applyCatalogOverrides<T extends { id: string; name: string; releaseDate?: string; series?: string; hidden?: boolean }>(
  sets: T[]
): T[] {
  return sets
    .map((set) => {
      const override = CATALOG_OVERRIDES[set.id.toLowerCase()];
      if (!override) return set;

      return {
        ...set,
        name: override.correctedName || set.name,
        releaseDate: override.releaseDateOverride || set.releaseDate,
        series: override.seriesOverride || set.series,
        hidden: override.hidden !== undefined ? override.hidden : set.hidden,
      };
    })
    .filter((s) => !s.hidden);
}

/**
 * Applies catalog overrides to a single PokemonCard.
 */
export function applyCardCatalogOverride(card: PokemonCard): PokemonCard {
  if (!card) return card;
  const override = CATALOG_OVERRIDES[card.setId?.toLowerCase()];
  
  let updatedCard = { ...card };
  if (override) {
    updatedCard.setName = override.correctedName || card.setName;
    updatedCard.setCode = override.correctedCode || card.setCode;
  }

  // Auto category inference corrections to avoid API misclassifications
  const nameLower = (updatedCard.name || '').toLowerCase();
  if (nameLower.includes('energia') || nameLower.includes('energy')) {
    updatedCard.category = 'Energy';
  } else if (
    nameLower.includes('bola') ||
    nameLower.includes('ball') ||
    nameLower.includes('pesquisa') ||
    nameLower.includes('research') ||
    nameLower.includes('ordens') ||
    nameLower.includes('orders') ||
    nameLower.includes('chefe') ||
    nameLower.includes('boss') ||
    nameLower.includes('recipiente') ||
    nameLower.includes('vessel') ||
    nameLower.includes('máquina') ||
    nameLower.includes('maquina') ||
    nameLower.includes('machine') ||
    nameLower.includes('substituição') ||
    nameLower.includes('substituicao') ||
    nameLower.includes('switch') ||
    nameLower.includes('cana') ||
    nameLower.includes('rod') ||
    nameLower.includes('vara') ||
    nameLower.includes('doce') ||
    nameLower.includes('candy') ||
    nameLower.includes('recolhida') ||
    nameLower.includes('scoop') ||
    nameLower.includes('poção') ||
    nameLower.includes('pocao') ||
    nameLower.includes('potion') ||
    nameLower.includes('compartilhamento') ||
    nameLower.includes('share') ||
    nameLower.includes('picareta') ||
    nameLower.includes('pickaxe') ||
    nameLower.includes('vácuo') ||
    nameLower.includes('vacuo') ||
    nameLower.includes('vacuum') ||
    nameLower.includes('pokébola') ||
    nameLower.includes('pokebola') ||
    nameLower.includes('pokegear') ||
    nameLower.includes('tênis') ||
    nameLower.includes('tenis') ||
    nameLower.includes('shoes') ||
    nameLower.includes('loja') ||
    nameLower.includes('store') ||
    nameLower.includes('pegador') ||
    nameLower.includes('catcher') ||
    nameLower.includes('artazon') ||
    nameLower.includes('estádio') ||
    nameLower.includes('estadio') ||
    nameLower.includes('stadium') ||
    nameLower.includes('mesagoza') ||
    nameLower.includes('colapsado') ||
    nameLower.includes('collapsed') ||
    nameLower.includes('apoiador') ||
    nameLower.includes('suporte') ||
    nameLower.includes('supporter') ||
    nameLower.includes('item') ||
    nameLower.includes('treinador') ||
    nameLower.includes('trainer')
  ) {
    updatedCard.category = 'Trainer';
  }

  return updatedCard;
}

/**
 * Applies catalog overrides to an array of PokemonCards.
 */
export function applyCardsCatalogOverrides(cards: PokemonCard[]): PokemonCard[] {
  return cards.map(applyCardCatalogOverride);
}

