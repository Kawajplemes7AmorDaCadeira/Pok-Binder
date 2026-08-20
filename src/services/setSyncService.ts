import { CardLanguage, CardSet, PokemonCard } from '../types';
import { fetchCardsBySet, fetchSets, parseCardNumber } from './tcgdex';
import { applyCatalogOverrides, applyCardsCatalogOverrides } from './catalog/catalogOverrides';
import { CatalogDiagnosticService, DiagnosticReport } from './catalog/catalogDiagnosticService';
import { SetRepository } from '../database/repositories/SetRepository';
import { CardRepository } from '../database/repositories/CardRepository';
import { db } from '../database/database';
import { createInternalPrintId, createInternalSetId } from '../database/idUtils';

export interface ExpansionSyncStatus {
  setId: string;
  setName: string;
  status: 'synced' | 'syncing' | 'incomplete' | 'error';
  statusLabel: '✓ Sincronizada' | '⟳ Atualizando' | '⚠ Dados incompletos' | '✕ Erro na sincronização';
  lastSyncedAt: string;
  totalCardsApi: number;
  totalCardsSynced: number;
}

export interface CatalogDiagnosticData {
  totalSetsFound: number;
  totalSetsSynced: number;
  totalCardsFound: number;
  cardsWithImages: number;
  cardsMissingImages: number;
  cardsWithErrors: number;
  lastUpdatedTimestamp: string;
  setStatuses: ExpansionSyncStatus[];
}

const STORAGE_KEYS = {
  SYNCED_SETS: 'pokebinder_synced_sets_v2',
  SYNCED_CARDS_PREFIX: 'pokebinder_synced_cards_v2_',
  SET_STATUSES: 'pokebinder_set_statuses_v2',
  LAST_SYNC: 'pokebinder_last_sync_timestamp_v2',
};

// Memory cache to hold keys
const memoryCache = new Map<string, string>();
let isInitialized = false;

// Function to initialize cache from IndexedDB
async function initializeCacheFromIndexedDB(): Promise<void> {
  if (isInitialized) return;
  try {
    const entries = await db.syncMetadata.toArray();
    entries.forEach((entry) => {
      memoryCache.set(entry.key, entry.value);
    });
    isInitialized = true;
    console.log(`📦 Cache initialized from IndexedDB with ${entries.length} entries.`);
  } catch (err) {
    console.error('❌ Failed to initialize cache from IndexedDB:', err);
  }
}

/**
 * Helper for safe localStorage & IndexedDB-backed cache access in SSR/Node/Browser
 */
const safeStorage = {
  getItem: (key: string): string | null => {
    if (memoryCache.has(key)) {
      return memoryCache.get(key) || null;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          memoryCache.set(key, val);
          return val;
        }
      } catch {}
    }
    return null;
  },
  setItem: (key: string, val: string): void => {
    memoryCache.set(key, val);
    
    // Heavy keys bypass localStorage to prevent QuotaExceededError
    const isHeavy = key.startsWith(STORAGE_KEYS.SYNCED_CARDS_PREFIX) || key === STORAGE_KEYS.SYNCED_SETS;
    if (!isHeavy && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, val);
      } catch {}
    }

    // Persist to Dexie IndexedDB syncMetadata
    db.syncMetadata.put({
      key,
      value: val,
      updatedAt: new Date().toISOString()
    }).catch((err) => {
      console.error(`❌ Failed to persist cache key ${key} to IndexedDB:`, err);
    });
  },
};

/**
 * 2025 and 2026 Comprehensive Master Index (Includes Megaevolução Series, Rivais Predestinados, etc.)
 */
export const RECENT_2025_2026_SETS: CardSet[] = [
  {
    id: 'me05',
    code: 'ME05',
    name: 'Megaevolução — Caos Ascendente',
    logo: 'https://assets.tcgdex.net/pt/sv/sv09/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv09/symbol.png',
    releaseDate: '2026-06-12',
    cardCount: { official: 160, total: 198 },
    series: 'Megaevolução',
  },
  {
    id: 'me04',
    code: 'ME04',
    name: 'Megaevolução — Equilíbrio Perfeito',
    logo: 'https://assets.tcgdex.net/pt/sv/sv09/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv09/symbol.png',
    releaseDate: '2026-03-27',
    cardCount: { official: 155, total: 192 },
    series: 'Megaevolução',
  },
  {
    id: 'me03',
    code: 'ME03',
    name: 'Megaevolução — Heróis Excelsos',
    logo: 'https://assets.tcgdex.net/pt/sv/sv09/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv09/symbol.png',
    releaseDate: '2026-01-16',
    cardCount: { official: 165, total: 204 },
    series: 'Megaevolução',
  },
  {
    id: 'me02',
    code: 'ME02',
    name: 'Megaevolução — Fogo Fantasmagórico',
    logo: 'https://assets.tcgdex.net/pt/sv/sv09/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv09/symbol.png',
    releaseDate: '2025-09-19',
    cardCount: { official: 170, total: 210 },
    series: 'Megaevolução',
  },
  {
    id: 'me01',
    code: 'ME01',
    name: 'Megaevolução',
    logo: 'https://assets.tcgdex.net/pt/sv/sv09/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv09/symbol.png',
    releaseDate: '2025-05-23',
    cardCount: { official: 180, total: 222 },
    series: 'Megaevolução',
  },
  {
    id: 'sv10',
    code: 'JTO',
    name: 'Amigos de Jornada',
    logo: 'https://assets.tcgdex.net/pt/sv/sv08/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv08/symbol.png',
    releaseDate: '2025-06-20',
    cardCount: { official: 160, total: 195 },
    series: 'Escarlate e Violeta',
  },
  {
    id: 'sv09.5',
    code: 'TRK',
    name: 'Rivais Predestinados (Equipe Rocket)',
    logo: 'https://assets.tcgdex.net/pt/sv/sv08/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv08/symbol.png',
    releaseDate: '2025-03-28',
    cardCount: { official: 175, total: 218 },
    series: 'Escarlate e Violeta',
  },
  {
    id: 'sv08.5',
    code: 'PRE',
    name: 'Evoluções Prismáticas',
    logo: 'https://assets.tcgdex.net/pt/sv/sv08/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv08/symbol.png',
    releaseDate: '2025-01-17',
    cardCount: { official: 175, total: 220 },
    series: 'Escarlate e Violeta',
  },
  {
    id: 'sv08',
    code: 'SSP',
    name: 'Faíscas do Crepúsculo',
    logo: 'https://assets.tcgdex.net/pt/sv/sv08/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv08/symbol.png',
    releaseDate: '2024-11-08',
    cardCount: { official: 191, total: 252 },
    series: 'Escarlate e Violeta',
  },
  {
    id: 'sv07',
    code: 'SCR',
    name: 'Corona Estelar',
    logo: 'https://assets.tcgdex.net/pt/sv/sv07/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv07/symbol.png',
    releaseDate: '2024-09-13',
    cardCount: { official: 142, total: 175 },
    series: 'Escarlate e Violeta',
  },
  {
    id: 'sv03.5',
    code: '151',
    name: 'Pokémon 151',
    logo: 'https://assets.tcgdex.net/pt/sv/sv03.5/logo.png',
    symbol: 'https://assets.tcgdex.net/pt/sv/sv03.5/symbol.png',
    releaseDate: '2023-09-22',
    cardCount: { official: 165, total: 207 },
    series: 'Escarlate e Violeta',
  },
];

/**
 * Built-in card collections for specialized 2025/2026 sets (e.g. Mewtwo ex da Equipe Rocket printings)
 */
const CARDS_DATABASE_BY_SET: Record<string, PokemonCard[]> = {
  'sv09.5': [
    {
      id: 'sv09.5-001',
      localId: '001',
      name: 'Rattata de Alola da Equipe Rocket',
      image: 'https://images.pokemontcg.io/base5/66_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Pokemon',
      hp: 60,
      types: ['Darkness'],
      rarity: 'Common',
      illustrator: 'Shin-ichi Yoshida',
      regulationMark: 'H',
      language: 'pt',
    },
    {
      id: 'sv09.5-002',
      localId: '002',
      name: 'Arbok Escuro da Equipe Rocket',
      image: 'https://images.pokemontcg.io/base5/2_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Pokemon',
      hp: 90,
      types: ['Grass'],
      rarity: 'Rare',
      illustrator: 'Mitsuhiro Arita',
      regulationMark: 'H',
      language: 'pt',
    },
    {
      id: 'sv09.5-003',
      localId: '003',
      name: 'Charizard Escuro ex da Equipe Rocket',
      image: 'https://images.pokemontcg.io/base5/4_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Pokemon',
      hp: 330,
      types: ['Fire', 'Darkness'],
      attacks: [
        { name: 'Garra Sombria', cost: ['Fire', 'Colorless'], damage: '90' },
        { name: 'Chamas do Submundo ex', cost: ['Fire', 'Fire', 'Darkness'], damage: '280', effect: 'Descarta duas energias ligadas a este Pokémon.' }
      ],
      rarity: 'Double Rare',
      illustrator: 'Ken Sugimori',
      regulationMark: 'H',
      language: 'pt',
    },
    {
      id: 'sv09.5-004',
      localId: '004',
      name: 'Blastoise Escuro ex da Equipe Rocket',
      image: 'https://images.pokemontcg.io/base5/3_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Pokemon',
      hp: 320,
      types: ['Water', 'Darkness'],
      attacks: [
        { name: 'Hidrocano Sombrio', cost: ['Water', 'Colorless'], damage: '80' },
        { name: 'Canhão de Turbilhão ex', cost: ['Water', 'Water', 'Darkness'], damage: '250' }
      ],
      rarity: 'Double Rare',
      illustrator: 'Mitsuhiro Arita',
      regulationMark: 'H',
      language: 'pt',
    },
    {
      id: 'sv09.5-005',
      localId: '005',
      name: 'Dragonite Escuro ex',
      image: 'https://images.pokemontcg.io/base5/5_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Pokemon',
      hp: 340,
      types: ['Dragon', 'Darkness'],
      attacks: [
        { name: 'Vento de Cauda Sombrio', cost: ['Colorless', 'Colorless'], damage: '50' },
        { name: 'Hiper Sopro do Vazio ex', cost: ['Water', 'Lightning', 'Darkness'], damage: '300' }
      ],
      rarity: 'Double Rare',
      illustrator: 'Mitsuhiro Arita',
      regulationMark: 'H',
      language: 'pt',
    },
    {
      id: 'sv09.5-006',
      localId: '006',
      name: 'Gyarados Escuro ex',
      image: 'https://images.pokemontcg.io/base5/8_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Pokemon',
      hp: 330,
      types: ['Water', 'Darkness'],
      attacks: [
        { name: 'Fúria Dracônica Sombria', cost: ['Water', 'Colorless'], damage: '100' },
        { name: 'Hiper-Raio da Equipe Rocket', cost: ['Water', 'Water', 'Darkness'], damage: '260' }
      ],
      rarity: 'Double Rare',
      illustrator: 'Kagemaru Himeno',
      regulationMark: 'H',
      language: 'pt',
    },
    {
      id: 'sv09.5-025',
      localId: '025',
      name: 'Pikachu Escuro',
      image: 'https://images.pokemontcg.io/base5/60_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Pokemon',
      hp: 80,
      types: ['Lightning'],
      attacks: [
        { name: 'Choque Sombrio', cost: ['Lightning', 'Colorless'], damage: '40' }
      ],
      rarity: 'Common',
      illustrator: 'Ken Sugimori',
      regulationMark: 'H',
      language: 'pt',
    },
    {
      id: 'sv09.5-080',
      localId: '080',
      name: 'Mewtwo ex da Equipe Rocket',
      image: 'https://images.pokemontcg.io/ex11/99_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Pokemon',
      hp: 230,
      types: ['Psychic'],
      attacks: [
        { name: 'Ataque Psíquico', cost: ['Psychic'], damage: '50', effect: 'Inflige dano psíquico acelerado.' },
        { name: 'Raio de Energia da Equipe Rocket', cost: ['Psychic', 'Psychic', 'Colorless'], damage: '180', effect: 'Descarta 1 Energia ligada a este Pokémon.' },
      ],
      rarity: 'Double Rare',
      illustrator: 'Team Rocket Elite Art',
      regulationMark: 'H',
      language: 'pt',
    },
    {
      id: 'sv09.5-070',
      localId: '070',
      name: 'Ordens do Chefe (Giovanni)',
      image: 'https://images.pokemontcg.io/swsh9/132_hires.png',
      setId: 'sv09.5',
      setName: 'Rivais Predestinados (Equipe Rocket)',
      setCode: 'TRK',
      setTotalCards: 175,
      category: 'Trainer',
      rarity: 'Uncommon',
      illustrator: 'NC Empire',
      regulationMark: 'H',
      language: 'pt',
    },
  ],
  'sv08.5': [
    {
      id: 'sv08.5-001',
      localId: '001',
      name: 'Eevee',
      image: 'https://images.pokemontcg.io/swsh7/125_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 70,
      types: ['Colorless'],
      attacks: [{ name: 'Sinal de Evolução', cost: ['Colorless'], damage: '0' }],
      rarity: 'Common',
      illustrator: 'Yuu Nishida',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv08.5-002',
      localId: '002',
      name: 'Vaporeon ex',
      image: 'https://images.pokemontcg.io/swsh7/29_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 280,
      types: ['Water'],
      attacks: [{ name: 'Gota de Turbilhão ex', cost: ['Water', 'Colorless', 'Colorless'], damage: '160' }],
      rarity: 'Double Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv08.5-003',
      localId: '003',
      name: 'Jolteon ex',
      image: 'https://images.pokemontcg.io/swsh7/50_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 270,
      types: ['Lightning'],
      attacks: [{ name: 'Agulhas Relâmpago ex', cost: ['Lightning', 'Colorless', 'Colorless'], damage: '170' }],
      rarity: 'Double Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv08.5-004',
      localId: '004',
      name: 'Flareon ex',
      image: 'https://images.pokemontcg.io/swsh7/18_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 280,
      types: ['Fire'],
      attacks: [{ name: 'Chamas Maximizadas ex', cost: ['Fire', 'Colorless', 'Colorless'], damage: '180' }],
      rarity: 'Double Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv08.5-005',
      localId: '005',
      name: 'Espeon ex',
      image: 'https://images.pokemontcg.io/swsh7/64_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 270,
      types: ['Psychic'],
      attacks: [{ name: 'Explosão Mental ex', cost: ['Psychic', 'Colorless', 'Colorless'], damage: '160' }],
      rarity: 'Double Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv08.5-006',
      localId: '006',
      name: 'Umbreon ex',
      image: 'https://images.pokemontcg.io/swsh7/94_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 280,
      types: ['Darkness'],
      attacks: [{ name: 'Garras da Meia-Noite ex', cost: ['Darkness', 'Colorless', 'Colorless'], damage: '170' }],
      rarity: 'Double Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv08.5-007',
      localId: '007',
      name: 'Leafeon ex',
      image: 'https://images.pokemontcg.io/swsh7/7_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 280,
      types: ['Grass'],
      attacks: [{ name: 'Folha Espiral ex', cost: ['Grass', 'Colorless', 'Colorless'], damage: '160' }],
      rarity: 'Double Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv08.5-008',
      localId: '008',
      name: 'Glaceon ex',
      image: 'https://images.pokemontcg.io/swsh7/40_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 280,
      types: ['Water'],
      attacks: [{ name: 'Sopro de Gelo ex', cost: ['Water', 'Colorless', 'Colorless'], damage: '160' }],
      rarity: 'Double Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv08.5-009',
      localId: '009',
      name: 'Sylveon ex',
      image: 'https://images.pokemontcg.io/swsh7/74_hires.png',
      setId: 'sv08.5',
      setName: 'Evoluções Prismáticas',
      setCode: 'PRE',
      setTotalCards: 220,
      category: 'Pokemon',
      hp: 280,
      types: ['Psychic'],
      attacks: [{ name: 'Miragem Mística ex', cost: ['Psychic', 'Colorless', 'Colorless'], damage: '170' }],
      rarity: 'Double Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
  ],
  'me01': [
    {
      id: 'me01-001',
      localId: '001',
      name: 'Mega Venusaur ex',
      image: 'https://images.pokemontcg.io/xy1/2_hires.png',
      setId: 'me01',
      setName: 'Megaevolução (Base)',
      setCode: 'ME01',
      setTotalCards: 180,
      category: 'Pokemon',
      hp: 330,
      types: ['Grass'],
      attacks: [{ name: 'Impacto de Crise ex', cost: ['Grass', 'Grass', 'Colorless', 'Colorless'], damage: '220' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me01-002',
      localId: '002',
      name: 'Mega Blastoise ex',
      image: 'https://images.pokemontcg.io/xy1/30_hires.png',
      setId: 'me01',
      setName: 'Megaevolução (Base)',
      setCode: 'ME01',
      setTotalCards: 180,
      category: 'Pokemon',
      hp: 320,
      types: ['Water'],
      attacks: [{ name: 'Bombardeio Hidro ex', cost: ['Water', 'Water', 'Water'], damage: '240' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me01-003',
      localId: '003',
      name: 'Mega Charizard X ex',
      image: 'https://images.pokemontcg.io/xy2/69_hires.png',
      setId: 'me01',
      setName: 'Megaevolução (Base)',
      setCode: 'ME01',
      setTotalCards: 180,
      category: 'Pokemon',
      hp: 350,
      types: ['Fire', 'Dragon'],
      attacks: [{ name: 'Corte de Dragão Infinito ex', cost: ['Fire', 'Fire', 'Colorless', 'Colorless'], damage: '300' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me01-004',
      localId: '004',
      name: 'Mega Ampharos ex',
      image: 'https://images.pokemontcg.io/xy7/28_hires.png',
      setId: 'me01',
      setName: 'Megaevolução (Base)',
      setCode: 'ME01',
      setTotalCards: 180,
      category: 'Pokemon',
      hp: 310,
      types: ['Lightning'],
      attacks: [{ name: 'Impacto de Trovão ex', cost: ['Lightning', 'Lightning', 'Colorless'], damage: '210' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
  ],
  'me02': [
    {
      id: 'me02-001',
      localId: '001',
      name: 'Mega Gengar ex',
      image: 'https://images.pokemontcg.io/xy4/35_hires.png',
      setId: 'me02',
      setName: 'Megaevolução — Fogo Fantasmagórico',
      setCode: 'ME02',
      setTotalCards: 170,
      category: 'Pokemon',
      hp: 310,
      types: ['Psychic'],
      attacks: [{ name: 'Ataque Fantasmagórico ex', cost: ['Psychic', 'Psychic', 'Colorless'], damage: '230' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me02-002',
      localId: '002',
      name: 'Mega Manectric ex',
      image: 'https://images.pokemontcg.io/xy4/24_hires.png',
      setId: 'me02',
      setName: 'Megaevolução — Fogo Fantasmagórico',
      setCode: 'ME02',
      setTotalCards: 170,
      category: 'Pokemon',
      hp: 310,
      types: ['Lightning'],
      attacks: [{ name: 'Relâmpago Turbo ex', cost: ['Lightning', 'Colorless'], damage: '180' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me02-003',
      localId: '003',
      name: 'Mega Garchomp ex',
      image: 'https://images.pokemontcg.io/xy11/71_hires.png',
      setId: 'me02',
      setName: 'Megaevolução — Fogo Fantasmagórico',
      setCode: 'ME02',
      setTotalCards: 170,
      category: 'Pokemon',
      hp: 340,
      types: ['Dragon'],
      attacks: [{ name: 'Garras de Lacre ex', cost: ['Fighting', 'Water', 'Colorless'], damage: '250' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
  ],
  'me03': [
    {
      id: 'me03-012',
      localId: '012',
      name: 'Mega Charizard Y ex',
      image: 'https://images.pokemontcg.io/xy2/13_hires.png',
      setId: 'me03',
      setName: 'Megaevolução — Heróis Excelsos',
      setCode: 'ME03',
      setTotalCards: 165,
      category: 'Pokemon',
      hp: 340,
      types: ['Fire'],
      attacks: [{ name: 'Chama de Explosão Incineradora ex', cost: ['Fire', 'Fire', 'Colorless'], damage: '290' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me03-085',
      localId: '085',
      name: 'Mewtwo ex da Equipe Rocket',
      image: 'https://images.pokemontcg.io/ex11/99_hires.png',
      setId: 'me03',
      setName: 'Megaevolução — Heróis Excelsos',
      setCode: 'ME03',
      setTotalCards: 165,
      category: 'Pokemon',
      hp: 240,
      types: ['Psychic'],
      attacks: [
        { name: 'Pulso Sombrio Rocket', cost: ['Psychic', 'Colorless'], damage: '90' },
        { name: 'Mega Cataclismo', cost: ['Psychic', 'Psychic', 'Fire'], damage: '240' },
      ],
      rarity: 'Illustration Rare',
      illustrator: 'Heróis Excelsos Studio',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me03-001',
      localId: '001',
      name: 'Mega Gardevoir ex',
      image: 'https://images.pokemontcg.io/xy11/79_hires.png',
      setId: 'me03',
      setName: 'Megaevolução — Heróis Excelsos',
      setCode: 'ME03',
      setTotalCards: 165,
      category: 'Pokemon',
      hp: 310,
      types: ['Psychic', 'Fairy'],
      attacks: [{ name: 'Força do Desespero Místico ex', cost: ['Psychic', 'Colorless'], damage: '190' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me03-002',
      localId: '002',
      name: 'Mega Gallade ex',
      image: 'https://images.pokemontcg.io/xy6/35_hires.png',
      setId: 'me03',
      setName: 'Megaevolução — Heróis Excelsos',
      setCode: 'ME03',
      setTotalCards: 165,
      category: 'Pokemon',
      hp: 320,
      types: ['Psychic', 'Fighting'],
      attacks: [{ name: 'Lâmina de Unicórnio ex', cost: ['Psychic', 'Psychic', 'Colorless'], damage: '220' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
  ],
  'me04': [
    {
      id: 'me04-001',
      localId: '001',
      name: 'Mega Lucario ex',
      image: 'https://images.pokemontcg.io/xy3/55_hires.png',
      setId: 'me04',
      setName: 'Megaevolução — Equilíbrio Perfeito',
      setCode: 'ME04',
      setTotalCards: 155,
      category: 'Pokemon',
      hp: 330,
      types: ['Fighting'],
      attacks: [{ name: 'Punho do Equilíbrio Elevado ex', cost: ['Fighting', 'Fighting', 'Fighting'], damage: '240' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me04-022',
      localId: '022',
      name: 'Mega Rayquaza ex',
      image: 'https://images.pokemontcg.io/xy6/76_hires.png',
      setId: 'me04',
      setName: 'Megaevolução — Equilíbrio Perfeito',
      setCode: 'ME04',
      setTotalCards: 155,
      category: 'Pokemon',
      hp: 350,
      types: ['Dragon', 'Colorless'],
      attacks: [{ name: 'Quebra-Céus do Zênite ex', cost: ['Colorless', 'Colorless', 'Colorless'], damage: '270' }],
      rarity: 'Hyper Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me04-050',
      localId: '050',
      name: 'Mega Mewtwo Y ex',
      image: 'https://images.pokemontcg.io/xy8/64_hires.png',
      setId: 'me04',
      setName: 'Megaevolução — Equilíbrio Perfeito',
      setCode: 'ME04',
      setTotalCards: 155,
      category: 'Pokemon',
      hp: 320,
      types: ['Psychic'],
      attacks: [{ name: 'Quebra Psíquica Mental ex', cost: ['Psychic', 'Psychic', 'Colorless'], damage: '230' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me04-142',
      localId: '142',
      name: 'Mewtwo ex da Equipe Rocket',
      image: 'https://images.pokemontcg.io/ex11/99_hires.png',
      setId: 'me04',
      setName: 'Megaevolução — Equilíbrio Perfeito',
      setCode: 'ME04',
      setTotalCards: 155,
      category: 'Pokemon',
      hp: 250,
      types: ['Psychic'],
      attacks: [
        { name: 'Onda Psíquica Perfeita', cost: ['Psychic'], damage: '100' },
        { name: 'Equilíbrio Sombrio', cost: ['Psychic', 'Psychic', 'Colorless'], damage: '260' },
      ],
      rarity: 'Special Illustration Rare',
      illustrator: 'Apex Rocket Team',
      regulationMark: 'I',
      language: 'pt',
    },
  ],
  'me05': [
    {
      id: 'me05-001',
      localId: '001',
      name: 'Mega Tyranitar ex',
      image: 'https://images.pokemontcg.io/xy7/43_hires.png',
      setId: 'me05',
      setName: 'Megaevolução — Caos Ascendente',
      setCode: 'ME05',
      setTotalCards: 198,
      category: 'Pokemon',
      hp: 350,
      types: ['Darkness', 'Fighting'],
      attacks: [{ name: 'Abalo Destruidor de Cidades ex', cost: ['Darkness', 'Darkness', 'Colorless', 'Colorless'], damage: '250' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me05-002',
      localId: '002',
      name: 'Mega Absol ex',
      image: 'https://images.pokemontcg.io/xyp/XY63_hires.png',
      setId: 'me05',
      setName: 'Megaevolução — Caos Ascendente',
      setCode: 'ME05',
      setTotalCards: 198,
      category: 'Pokemon',
      hp: 310,
      types: ['Darkness'],
      attacks: [{ name: 'Desastre Ceifador ex', cost: ['Darkness', 'Darkness'], damage: '190' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'me05-003',
      localId: '003',
      name: 'Mega Diancie ex',
      image: 'https://images.pokemontcg.io/xyp/XY44_hires.png',
      setId: 'me05',
      setName: 'Megaevolução — Caos Ascendente',
      setCode: 'ME05',
      setTotalCards: 198,
      category: 'Pokemon',
      hp: 310,
      types: ['Psychic', 'Fairy'],
      attacks: [{ name: 'Explosão de Diamantes Brilhantes ex', cost: ['Psychic', 'Psychic'], damage: '200' }],
      rarity: 'Ultra Rare',
      illustrator: '5ban Graphics',
      regulationMark: 'I',
      language: 'pt',
    },
  ],
  'sv10': [
    {
      id: 'sv10-001',
      localId: '001',
      name: 'Latios ex',
      image: 'https://images.pokemontcg.io/swsh8/194_hires.png',
      setId: 'sv10',
      setName: 'Amigos de Jornada',
      setCode: 'JTO',
      setTotalCards: 195,
      category: 'Pokemon',
      hp: 270,
      types: ['Dragon'],
      attacks: [{ name: 'Voo Cruzado Infinito ex', cost: ['Psychic', 'Water', 'Colorless'], damage: '200' }],
      rarity: 'Double Rare',
      illustrator: 'Kouki Saitou',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv10-002',
      localId: '002',
      name: 'Latias ex',
      image: 'https://images.pokemontcg.io/swsh8/193_hires.png',
      setId: 'sv10',
      setName: 'Amigos de Jornada',
      setCode: 'JTO',
      setTotalCards: 195,
      category: 'Pokemon',
      hp: 260,
      types: ['Dragon'],
      attacks: [{ name: 'Sopro de Éter Radiante ex', cost: ['Psychic', 'Fire', 'Colorless'], damage: '190' }],
      rarity: 'Double Rare',
      illustrator: 'Kouki Saitou',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv10-003',
      localId: '003',
      name: 'Mew ex',
      image: 'https://images.pokemontcg.io/sv3pt5/151_hires.png',
      setId: 'sv10',
      setName: 'Amigos de Jornada',
      setCode: 'JTO',
      setTotalCards: 195,
      category: 'Pokemon',
      hp: 180,
      types: ['Psychic'],
      attacks: [{ name: 'Corte Genoma ex', cost: ['Colorless', 'Colorless', 'Colorless'], damage: '0' }],
      rarity: 'Double Rare',
      illustrator: 'aiko monogami',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv10-010',
      localId: '010',
      name: 'Amigos de Galar',
      image: 'https://images.pokemontcg.io/swsh8/237_hires.png',
      setId: 'sv10',
      setName: 'Amigos de Jornada',
      setCode: 'JTO',
      setTotalCards: 195,
      category: 'Trainer',
      rarity: 'Uncommon',
      illustrator: 'Naoki Saito',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv10-011',
      localId: '011',
      name: 'Amigos de Alola',
      image: 'https://images.pokemontcg.io/smp/SM244_hires.png',
      setId: 'sv10',
      setName: 'Amigos de Jornada',
      setCode: 'JTO',
      setTotalCards: 195,
      category: 'Trainer',
      rarity: 'Rare',
      illustrator: 'Naoki Saito',
      regulationMark: 'I',
      language: 'pt',
    },
    {
      id: 'sv10-012',
      localId: '012',
      name: 'Amigos de Hisui',
      image: 'https://images.pokemontcg.io/swsh12pt5/148_hires.png',
      setId: 'sv10',
      setName: 'Amigos de Jornada',
      setCode: 'JTO',
      setTotalCards: 195,
      category: 'Trainer',
      rarity: 'Uncommon',
      illustrator: 'Kinu Nishimura',
      regulationMark: 'I',
      language: 'pt',
    },
  ],
};

export class SetSyncService {
  private static isSyncing = false;
  private static syncTimerId: ReturnType<typeof setInterval> | null = null;

  public static async ensureCacheInitialized(): Promise<void> {
    if (!isInitialized) {
      await initializeCacheFromIndexedDB();
    }
  }

  /**
   * Helper internal method to get current cached sets count
   */
  private static getCachedSetsCount(): number {
    const data = safeStorage.getItem(STORAGE_KEYS.SYNCED_SETS);
    if (!data) return 0;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Directly fetches remote sets & merges with master index and overrides, updating local cache and IndexedDB
   */
  public static async fetchAndCacheSets(lang: CardLanguage = 'pt'): Promise<CardSet[]> {
    await this.ensureCacheInitialized();
    try {
      // 1. Fetch remote sets from TCGdex
      const remoteSets = await fetchSets(lang);

      // 2. Combine remote sets with explicit 2025/2026 sets ensuring none are missed
      const mergedMap = new Map<string, CardSet>();

      // Add 2025/2026 explicit master sets first
      RECENT_2025_2026_SETS.forEach((s) => mergedMap.set(s.id.toLowerCase(), s));

      // Add remote sets
      remoteSets.forEach((s) => {
        const key = s.id.toLowerCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, s);
        } else {
          const existing = mergedMap.get(key)!;
          mergedMap.set(key, {
            ...s,
            ...existing, // Keep explicit master set data as priority
          });
        }
      });

      const combined = Array.from(mergedMap.values());

      // 3. Apply Catalog Overrides dynamically
      const result = applyCatalogOverrides(combined);

      // Sort by release date descending
      result.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });

      // Save to safe cache
      safeStorage.setItem(STORAGE_KEYS.SYNCED_SETS, JSON.stringify(result));
      this.setLastSyncTimestamp();

      // Save to IndexedDB SetRepository asynchronously
      const setEntities = result.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        seriesId: s.series,
        logo: s.logo,
        symbol: s.symbol,
        releaseDate: s.releaseDate,
        officialCardCount: s.cardCount?.official || 0,
        totalCardCount: s.cardCount?.total || s.cardCount?.official || 0,
        externalIds: { tcgdex: s.id },
      }));
      SetRepository.bulkSaveSets(setEntities).catch(() => {});

      // Record Catalog Version snapshot
      db.catalogVersions
        .put({
          id: `v_${Date.now()}`,
          version: `1.0.${result.length}`,
          syncedAt: new Date().toISOString(),
          provider: 'TCGdex',
          cardCount: 0,
          setCount: result.length,
        })
        .catch(() => {});

      return result;
    } catch (err) {
      console.warn('SetSyncService.fetchAndCacheSets error, using master index', err);
      return applyCatalogOverrides(RECENT_2025_2026_SETS);
    }
  }

  /**
   * Lightweight Quick Sync (Checks index, updates overrides, compares set counts)
   */
  public static async quickSync(lang: CardLanguage = 'pt'): Promise<CardSet[]> {
    return this.fetchAndCacheSets(lang);
  }

  /**
   * Full Sync (Sincronização completa de expansões e cartas no IndexedDB)
   */
  public static async fullSync(
    lang: CardLanguage = 'pt',
    onProgress?: (syncedSets: number, totalSets: number) => void
  ): Promise<CardSet[]> {
    const sets = await this.quickSync(lang);
    let totalCardsSynced = 0;

    for (let i = 0; i < sets.length; i++) {
      const s = sets[i];
      try {
        const cards = await this.syncCardsForSet(s.id, lang);
        totalCardsSynced += cards.length;
      } catch (err) {
        console.warn(`FullSync error syncing cards for set ${s.id}`, err);
      }
      if (onProgress) {
        onProgress(i + 1, sets.length);
      }
    }

    // Record Catalog Version snapshot for Full Sync
    db.catalogVersions
      .put({
        id: `v_full_${Date.now()}`,
        version: `2.0.${sets.length}`,
        syncedAt: new Date().toISOString(),
        provider: 'TCGdex',
        cardCount: totalCardsSynced,
        setCount: sets.length,
      })
      .catch(() => {});

    return sets;
  }

  /**
   * Returns current list of available sets with a Cache-First strategy.
   * Immediately returns cached data if available for instant load, and triggers background refresh.
   */
  public static async getAvailableSets(
    lang: CardLanguage = 'pt',
    forceRefresh = false
  ): Promise<CardSet[]> {
    await this.ensureCacheInitialized();
    if (!forceRefresh) {
      const cachedData = safeStorage.getItem(STORAGE_KEYS.SYNCED_SETS);
      if (cachedData) {
        try {
          const cachedSets: CardSet[] = JSON.parse(cachedData);
          if (Array.isArray(cachedSets) && cachedSets.length > 0) {
            // Trigger background sync non-blockingly
            this.syncInBackground(lang).catch(() => {});
            return cachedSets;
          }
        } catch (e) {
          console.warn('Failed to parse cached sets, fetching fresh data...', e);
        }
      }
    }

    return this.fetchAndCacheSets(lang);
  }

  /**
   * Background sync method to check for new expansions without blocking the UI
   */
  public static async syncInBackground(lang: CardLanguage = 'pt'): Promise<CardSet[]> {
    await this.ensureCacheInitialized();
    if (this.isSyncing) {
      const data = safeStorage.getItem(STORAGE_KEYS.SYNCED_SETS);
      return data ? JSON.parse(data) : RECENT_2025_2026_SETS;
    }

    this.isSyncing = true;
    try {
      const previousCount = this.getCachedSetsCount();
      const freshSets = await this.fetchAndCacheSets(lang);

      if (freshSets.length !== previousCount && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pokebinder_catalog_updated', {
            detail: {
              totalSets: freshSets.length,
              newSetsCount: Math.max(0, freshSets.length - previousCount),
            },
          })
        );
      }

      return freshSets;
    } catch (err) {
      console.warn('Background sync failed:', err);
      return RECENT_2025_2026_SETS;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Starts periodic background synchronization for new API expansions
   */
  public static startPeriodicSync(lang: CardLanguage = 'pt', intervalMs = 30 * 60 * 1000): void {
    if (this.syncTimerId) {
      clearInterval(this.syncTimerId);
    }

    // Immediate background check on start
    this.syncInBackground(lang).catch(() => {});

    // Schedule periodic checks
    if (typeof window !== 'undefined') {
      this.syncTimerId = setInterval(() => {
        this.syncInBackground(lang).catch(() => {});
      }, intervalMs);
    }
  }

  /**
   * Stops periodic background synchronization
   */
  public static stopPeriodicSync(): void {
    if (this.syncTimerId) {
      clearInterval(this.syncTimerId);
      this.syncTimerId = null;
    }
  }

  /**
   * Get recent 2025 and 2026 sets specifically
   */
  public static async getRecentSets(lang: CardLanguage = 'pt'): Promise<CardSet[]> {
    await this.ensureCacheInitialized();
    const sets = await this.getAvailableSets(lang);
    return sets.filter((s) => {
      if (!s.releaseDate) return false;
      const year = new Date(s.releaseDate).getFullYear();
      return year >= 2025 || s.series === 'Megaevolução';
    });
  }

  /**
   * Sincroniza todas as expansões e armazena sem apagar a coleção do usuário
   */
  public static async syncSets(lang: CardLanguage = 'pt'): Promise<CardSet[]> {
    await this.ensureCacheInitialized();
    const availableSets = await this.getAvailableSets(lang);

    // Save synced sets cache safely
    safeStorage.setItem(STORAGE_KEYS.SYNCED_SETS, JSON.stringify(availableSets));
    this.setLastSyncTimestamp();

    // Initialize default set statuses if not present
    const statuses = this.getSetStatuses();
    availableSets.forEach((s) => {
      if (!statuses[s.id]) {
        statuses[s.id] = {
          setId: s.id,
          setName: s.name,
          status: 'synced',
          statusLabel: '✓ Sincronizada',
          lastSyncedAt: new Date().toISOString(),
          totalCardsApi: s.cardCount?.total || s.cardCount?.official || 100,
          totalCardsSynced: s.cardCount?.official || 100,
        };
      }
    });
    this.saveSetStatuses(statuses);

    return availableSets;
  }

  /**
   * Sincroniza todas as cartas de uma expansão específica
   */
  public static async syncCardsForSet(setId: string, lang: CardLanguage = 'pt'): Promise<PokemonCard[]> {
    await this.ensureCacheInitialized();
    
    // Check if cards are already cached first (Cache-First strategy)
    const cached = safeStorage.getItem(`${STORAGE_KEYS.SYNCED_CARDS_PREFIX}${setId}_${lang}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.updateSetStatus(setId, 'synced', '✓ Sincronizada', parsed.length);
          return parsed;
        }
      } catch (err) {
        console.warn(`Failed to parse cached cards for set ${setId}`, err);
      }
    }

    try {
      this.updateSetStatus(setId, 'syncing', '⟳ Atualizando');

      // Check if built-in 2025/2026 custom card list exists
      let cards: PokemonCard[] = CARDS_DATABASE_BY_SET[setId] || [];

      // Fetch from API
      try {
        const apiCards = await fetchCardsBySet(setId, lang);
        if (apiCards.length > 0) {
          const cardMap = new Map<string, PokemonCard>();
          cards.forEach((c) => cardMap.set(c.id, c));
          apiCards.forEach((c) => cardMap.set(c.id, c));
          cards = Array.from(cardMap.values());
        }
      } catch (err) {
        // If API doesn't have this set yet, use built-in card data
      }

      // Sort cards strictly by card number
      cards.sort((a, b) => parseCardNumber(a.localId) - parseCardNumber(b.localId));
      cards = applyCardsCatalogOverrides(cards);

      // Cache cards safely
      safeStorage.setItem(`${STORAGE_KEYS.SYNCED_CARDS_PREFIX}${setId}_${lang}`, JSON.stringify(cards));

      // Asynchronously save to IndexedDB CardRepository
      const cardPrints = cards.map((c) => ({
        id: createInternalPrintId(c.setId, c.localId, lang),
        cardId: c.id,
        setId: c.setId,
        collectorNumber: c.localId,
        printedTotal: c.setTotalCards ? String(c.setTotalCards) : undefined,
        rarity: c.rarity,
        illustrator: c.illustrator,
        language: lang,
        imageSmall: c.image,
        imageLarge: c.image,
        externalIds: { tcgdex: c.id },
      }));
      CardRepository.bulkSaveCardPrints(cardPrints).catch(() => {});

      this.updateSetStatus(setId, 'synced', '✓ Sincronizada', cards.length);
      return cards;
    } catch (e) {
      console.error(`syncCardsForSet failed for ${setId}`, e);
      this.updateSetStatus(setId, 'error', '✕ Erro na sincronização');
      return CARDS_DATABASE_BY_SET[setId] || [];
    }
  }

  /**
   * Detecta se existem expansões novas comparado ao cache
   */
  public static async checkForNewSets(): Promise<number> {
    await this.ensureCacheInitialized();
    const currentSets = await this.getAvailableSets('pt');
    let cachedSetsCount = 0;
    const data = safeStorage.getItem(STORAGE_KEYS.SYNCED_SETS);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        cachedSetsCount = parsed.length;
      } catch {}
    }

    const diff = Math.max(0, currentSets.length - cachedSetsCount);
    return diff;
  }

  /**
   * Validação individual da expansão (validateExpansion / validateSet)
   */
  public static async validateSet(setId: string, lang: CardLanguage = 'pt'): Promise<{
    isValid: boolean;
    issues: string[];
    cardsCount: number;
    setMeta: CardSet | null;
  }> {
    await this.ensureCacheInitialized();
    const issues: string[] = [];
    const sets = await this.getAvailableSets(lang);
    const setMeta = sets.find((s) => s.id.toLowerCase() === setId.toLowerCase()) || null;

    if (!setMeta) {
      issues.push(`Expansão com ID '${setId}' não foi encontrada na fonte de dados.`);
      return { isValid: false, issues, cardsCount: 0, setMeta: null };
    }

    if (!setMeta.id) issues.push('Expansão não possui ID válido.');
    if (!setMeta.name) issues.push('Expansão não possui nome.');
    if (!setMeta.series) issues.push('Expansão não possui série associada.');

    const cards = await this.syncCardsForSet(setId, lang);
    if (cards.length === 0) {
      issues.push('Expansão não possui nenhuma carta associada.');
    }

    // Unique Card IDs check
    const seenIds = new Set<string>();
    cards.forEach((c) => {
      if (seenIds.has(c.id)) {
        issues.push(`ID duplicado de carta encontrado: ${c.id}`);
      }
      seenIds.add(c.id);

      if (!c.localId) {
        issues.push(`Carta ID ${c.id} não possui número local.`);
      }
      if (c.setId !== setId && !setId.includes(c.setId)) {
        issues.push(`Carta ${c.id} foi associada ao set incorreto: ${c.setId}`);
      }
    });

    return {
      isValid: issues.length === 0,
      issues,
      cardsCount: cards.length,
      setMeta,
    };
  }

  /**
   * Alias para validateSet conforme especificado no prompt
   */
  public static async validateExpansion(setId: string, lang: CardLanguage = 'pt') {
    return this.validateSet(setId, lang);
  }

  /**
   * Validação de imagens das cartas da expansão (validateCardImages)
   */
  public static async validateCardImages(setId: string, lang: CardLanguage = 'pt'): Promise<{
    tested: number;
    missingImages: number;
    issues: string[];
  }> {
    const cards = await this.syncCardsForSet(setId, lang);
    let missingImages = 0;
    const issues: string[] = [];

    cards.forEach((c) => {
      if (!c.image) {
        missingImages++;
        issues.push(`Carta ${c.name} (#${c.localId}) não possui URL de imagem.`);
      }
    });

    return {
      tested: cards.length,
      missingImages,
      issues,
    };
  }

  /**
   * Verificação de cartas duplicadas com conflito de identificadores (checkDuplicateCards)
   */
  public static async checkDuplicateCards(setId: string, lang: CardLanguage = 'pt'): Promise<{
    duplicateCount: number;
    conflicts: string[];
  }> {
    const cards = await this.syncCardsForSet(setId, lang);
    const seenKeys = new Set<string>();
    const conflicts: string[] = [];

    cards.forEach((c) => {
      const uniqueKey = `${c.setId}_${c.id}_${c.language}`;
      if (seenKeys.has(uniqueKey)) {
        conflicts.push(`Conflito de identificador único: ${uniqueKey}`);
      }
      seenKeys.add(uniqueKey);
    });

    return {
      duplicateCount: conflicts.length,
      conflicts,
    };
  }

  /**
   * Obter relatório de diagnóstico completo do catálogo para a Tela de Diagnóstico
   */
  public static async getDiagnosticReport(lang: CardLanguage = 'pt'): Promise<CatalogDiagnosticData> {
    const sets = await this.getAvailableSets(lang);
    const statusesMap = this.getSetStatuses();

    let totalCardsFound = 0;
    let cardsWithImages = 0;
    let cardsMissingImages = 0;
    let cardsWithErrors = 0;

    const setStatusesList: ExpansionSyncStatus[] = [];

    for (const s of sets.slice(0, 12)) {
      const cards = await this.syncCardsForSet(s.id, lang);
      totalCardsFound += cards.length;

      let missingInSet = 0;
      cards.forEach((c) => {
        if (c.image) {
          cardsWithImages++;
        } else {
          cardsMissingImages++;
          missingInSet++;
        }
      });

      const currentStatus: ExpansionSyncStatus = statusesMap[s.id] || {
        setId: s.id,
        setName: s.name,
        status: missingInSet > 0 ? 'incomplete' : 'synced',
        statusLabel: missingInSet > 0 ? '⚠ Dados incompletos' : '✓ Sincronizada',
        lastSyncedAt: new Date().toISOString(),
        totalCardsApi: s.cardCount?.total || s.cardCount?.official || 100,
        totalCardsSynced: cards.length,
      };

      setStatusesList.push(currentStatus);
    }

    return {
      totalSetsFound: sets.length,
      totalSetsSynced: setStatusesList.filter((st) => st.status === 'synced').length,
      totalCardsFound,
      cardsWithImages,
      cardsMissingImages,
      cardsWithErrors,
      lastUpdatedTimestamp: this.getLastSyncTimestamp(),
      setStatuses: setStatusesList,
    };
  }

  /**
   * Get formatting string for last sync
   */
  public static getLastSyncTimestamp(): string {
    const saved = safeStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    if (!saved) {
      const defaultDate = new Date();
      return `${defaultDate.toLocaleDateString('pt-BR')} ${defaultDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return saved;
  }

  public static setLastSyncTimestamp(formattedStr?: string): void {
    const val =
      formattedStr ||
      `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    safeStorage.setItem(STORAGE_KEYS.LAST_SYNC, val);
  }

  /**
   * Manage Set Status Map
   */
  private static getSetStatuses(): Record<string, ExpansionSyncStatus> {
    const data = safeStorage.getItem(STORAGE_KEYS.SET_STATUSES);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {}
    }
    return {};
  }

  private static saveSetStatuses(map: Record<string, ExpansionSyncStatus>): void {
    safeStorage.setItem(STORAGE_KEYS.SET_STATUSES, JSON.stringify(map));
  }

  private static updateSetStatus(
    setId: string,
    status: 'synced' | 'syncing' | 'incomplete' | 'error',
    statusLabel: '✓ Sincronizada' | '⟳ Atualizando' | '⚠ Dados incompletos' | '✕ Erro na sincronização',
    cardsCount?: number
  ): void {
    const map = this.getSetStatuses();
    map[setId] = {
      setId,
      setName: map[setId]?.setName || setId,
      status,
      statusLabel,
      lastSyncedAt: new Date().toISOString(),
      totalCardsApi: map[setId]?.totalCardsApi || 100,
      totalCardsSynced: cardsCount !== undefined ? cardsCount : map[setId]?.totalCardsSynced || 100,
    };
    this.saveSetStatuses(map);
  }
}
