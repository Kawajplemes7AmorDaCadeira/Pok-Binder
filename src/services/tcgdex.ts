import { CardLanguage, CardSet, PokemonCard } from '../types';
import { applyCardCatalogOverride, applyCardsCatalogOverrides } from './catalog/catalogOverrides';

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2';

// In-memory server/client cache to minimize network calls & improve speed
const setsCache: Record<string, CardSet[]> = {};
const setDetailsCache: Record<string, PokemonCard[]> = {};
const cardDetailsCache: Record<string, PokemonCard> = {};

/**
 * Format raw image URL from TCGdex if needed
 */
export function formatCardImageUrl(rawUrl?: string, quality: 'high' | 'low' = 'high'): string | undefined {
  if (!rawUrl) return undefined;
  if (rawUrl.endsWith('.png') || rawUrl.endsWith('.jpg') || rawUrl.endsWith('.webp')) {
    return rawUrl;
  }
  // TCGdex base image path format
  return `${rawUrl}/${quality}.webp`;
}

/**
 * Normalizes card number for sorting and secret rare comparison.
 * e.g., '025' -> 25, '183' -> 183
 */
export function parseCardNumber(localId: string): number {
  if (!localId) return 9999;
  const match = localId.match(/^(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 9999;
}

/**
 * Helper to build standard fallback sets if API is unreachable
 */
export const FALLBACK_SETS: CardSet[] = [
  {
    id: 'sv03.5',
    code: '151',
    name: 'Pokémon 151',
    logo: 'https://assets.tcgdex.net/pt/sv/sv03.5/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv03.5/symbol.png',
    releaseDate: '2023-09-22',
    cardCount: { official: 165, total: 207 },
    series: 'Scarlet & Violet',
  },
  {
    id: 'sv04.5',
    code: 'PAF',
    name: 'Destinos de Paldea',
    logo: 'https://assets.tcgdex.net/pt/sv/sv04.5/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv04.5/symbol.png',
    releaseDate: '2024-01-26',
    cardCount: { official: 91, total: 245 },
    series: 'Scarlet & Violet',
  },
  {
    id: 'sv07',
    code: 'SCR',
    name: 'Amigos de Jornada / Stellar Crown',
    logo: 'https://assets.tcgdex.net/pt/sv/sv07/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv07/symbol.png',
    releaseDate: '2024-09-13',
    cardCount: { official: 142, total: 175 },
    series: 'Scarlet & Violet',
  },
  {
    id: 'sv08',
    code: 'SSP',
    name: 'Faíscas do Crepúsculo / Surging Sparks',
    logo: 'https://assets.tcgdex.net/pt/sv/sv08/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv08/symbol.png',
    releaseDate: '2024-11-08',
    cardCount: { official: 191, total: 252 },
    series: 'Scarlet & Violet',
  },
  {
    id: 'base1',
    code: 'BS',
    name: 'Base Set',
    logo: 'https://assets.tcgdex.net/pt/base/base1/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/base/base1/symbol.png',
    releaseDate: '1999-01-09',
    cardCount: { official: 102, total: 102 },
    series: 'Original',
  },
];

/**
 * Resilient fetch utility with exponential backoff and jitter retries.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  baseDelayMs = 500
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      // Don't retry client-side 404s since they are permanent
      if (response.status === 404) {
        return response;
      }
      throw new Error(`Server returned status ${response.status}`);
    } catch (err) {
      attempt++;
      if (attempt > retries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100;
      console.warn(`⚠️ Request failed. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${retries})...`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Fetch all sets from TCGdex in chosen language
 */
export async function fetchSets(lang: CardLanguage = 'pt'): Promise<CardSet[]> {
  if (setsCache[lang] && setsCache[lang].length > 0) {
    return setsCache[lang];
  }

  try {
    const response = await fetchWithRetry(`${TCGDEX_BASE_URL}/${lang}/sets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sets for ${lang}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid sets response format');
    }

    const formattedSets: CardSet[] = data.map((item: any) => ({
      id: item.id,
      code: item.code || item.id.toUpperCase(),
      name: item.name,
      logo: item.logo ? `${item.logo}.png` : undefined,
      symbol: item.symbol ? `${item.symbol}.png` : undefined,
      releaseDate: item.releaseDate,
      cardCount: {
        official: item.cardCount?.official || item.cardCount?.total || 100,
        total: item.cardCount?.total || item.cardCount?.official || 100,
      },
      series: item.series?.name || item.series || 'Pokémon TCG',
    }));

    setsCache[lang] = formattedSets;
    return formattedSets;
  } catch (err) {
    console.warn(`TCGdex fetchSets failed for ${lang}, using fallback/cache`, err);
    return FALLBACK_SETS;
  }
}

/**
 * Fetch cards for a specific set in chosen language
 */
export async function fetchCardsBySet(setId: string, lang: CardLanguage = 'pt'): Promise<PokemonCard[]> {
  const cacheKey = `${lang}_${setId}`;
  if (setDetailsCache[cacheKey]) {
    return setDetailsCache[cacheKey];
  }

  try {
    const res = await fetchWithRetry(`${TCGDEX_BASE_URL}/${lang}/sets/${setId}`);
    if (!res.ok) {
      console.info(`fetchCardsBySet info: Set ${setId} is not yet published on public TCGdex API. Using offline database fallback.`);
      return [];
    }
    const setData = await res.json();
    const rawCards = setData.cards || [];
    const officialTotal = setData.cardCount?.official || 100;

    const cards: PokemonCard[] = rawCards.map((c: any) => {
      const num = parseCardNumber(c.localId);
      const isSecret = num > officialTotal;
      const imageUrl = formatCardImageUrl(c.image, 'high');

      return {
        id: c.id,
        localId: c.localId,
        name: c.name,
        image: imageUrl,
        imageHighRes: imageUrl,
        setId: setData.id,
        setName: setData.name,
        setCode: setData.code || setData.id.toUpperCase(),
        setLogo: setData.logo ? `${setData.logo}.png` : undefined,
        setSymbol: setData.symbol ? `${setData.symbol}.png` : undefined,
        setTotalCards: officialTotal,
        category: c.category || 'Pokemon',
        hp: c.hp ? Number(c.hp) : undefined,
        types: c.types || [],
        rarity: c.rarity || (isSecret ? 'Secret Rare' : 'Common'),
        illustrator: c.illustrator,
        stage: c.stage,
        evolvesFrom: c.evolvesFrom,
        language: lang,
        isSecret,
      };
    });

    // Sort cards numerically by card number (001, 002, ... 182, 183...)
    cards.sort((a, b) => parseCardNumber(a.localId) - parseCardNumber(b.localId));

    const overriddenCards = applyCardsCatalogOverrides(cards);
    setDetailsCache[cacheKey] = overriddenCards;
    return overriddenCards;
  } catch (err) {
    console.info(`fetchCardsBySet info: Set ${setId} fetch offline fallback triggered.`);
    return [];
  }
}

/**
 * Fetch full card details by unique Card ID
 */
export async function fetchCardById(cardId: string, lang: CardLanguage = 'pt'): Promise<PokemonCard | null> {
  const cacheKey = `${lang}_${cardId}`;
  if (cardDetailsCache[cacheKey]) {
    return cardDetailsCache[cacheKey];
  }

  try {
    const res = await fetchWithRetry(`${TCGDEX_BASE_URL}/${lang}/cards/${cardId}`);
    if (!res.ok) {
      // If language-specific card fails, try 'en' fallback
      if (lang !== 'en') {
        return fetchCardById(cardId, 'en');
      }
      return null;
    }
    const c = await res.json();
    const officialTotal = c.set?.cardCount?.official || 100;
    const num = parseCardNumber(c.localId);
    const imageUrl = formatCardImageUrl(c.image, 'high');

    const card: PokemonCard = {
      id: c.id,
      localId: c.localId,
      name: c.name,
      image: imageUrl,
      imageHighRes: imageUrl,
      setId: c.set?.id || 'unknown',
      setName: c.set?.name || 'Expansion',
      setCode: c.set?.code || c.set?.id?.toUpperCase(),
      setLogo: c.set?.logo ? `${c.set.logo}.png` : undefined,
      setSymbol: c.set?.symbol ? `${c.set.symbol}.png` : undefined,
      setTotalCards: officialTotal,
      category: c.category || (c.hp ? 'Pokemon' : 'Trainer'),
      hp: c.hp ? Number(c.hp) : undefined,
      types: c.types || [],
      attacks: c.attacks
        ? c.attacks.map((a: any) => ({
            name: a.name,
            cost: a.cost || [],
            damage: a.damage ? String(a.damage) : undefined,
            effect: a.effect,
          }))
        : [],
      weaknesses: c.weaknesses
        ? c.weaknesses.map((w: any) => ({ type: w.type, value: w.value || 'x2' }))
        : [],
      resistances: c.resistances
        ? c.resistances.map((r: any) => ({ type: r.type, value: r.value || '-30' }))
        : [],
      retreat: c.retreat,
      rarity: c.rarity || 'Common',
      illustrator: c.illustrator,
      regulationMark: c.regulationMark,
      description: c.description || c.effect,
      stage: c.stage,
      evolvesFrom: c.evolvesFrom,
      language: lang,
      availableVariants: {
        normal: c.variants?.normal ?? true,
        reverse: c.variants?.reverse ?? false,
        holo: c.variants?.holo ?? false,
        firstEdition: c.variants?.firstEdition ?? false,
        wPrerelease: c.variants?.wPrerelease ?? false,
      },
      isSecret: num > officialTotal,
    };

    const overriddenCard = applyCardCatalogOverride(card);
    cardDetailsCache[cacheKey] = overriddenCard;
    return overriddenCard;
  } catch (err) {
    console.warn(`fetchCardById failed for cardId ${cardId}`, err);
    return null;
  }
}
