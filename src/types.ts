export type CardLanguage = 'pt' | 'en' | 'ja';

export type CardVariant = 'normal' | 'holo' | 'reverse' | 'cosmosHolo' | 'firstEdition' | 'wPrerelease' | 'promo' | 'stamped';

export type CardCondition = 'mint' | 'near_mint' | 'lightly_played' | 'moderately_played' | 'heavily_played' | 'damaged' | 'unspecified';

export interface CardSet {
  id: string;
  code?: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  cardCount: {
    official: number;
    total: number;
  };
  series?: string;
}

export interface CardAttack {
  name: string;
  cost?: string[];
  damage?: string;
  effect?: string;
}

export interface CardWeakness {
  type: string;
  value: string;
}

export interface CardResistance {
  type: string;
  value: string;
}

export interface PokemonCard {
  id: string; // Unique API ID e.g., 'sv03.5-025'
  localId: string; // e.g., '025' or '025/165'
  name: string;
  image?: string; // Full resolution URL
  imageHighRes?: string;
  setId: string;
  setName: string;
  setCode?: string;
  setLogo?: string;
  setSymbol?: string;
  setTotalCards?: number; // Official total count
  category?: 'Pokemon' | 'Trainer' | 'Energy' | string; // Category
  hp?: number;
  types?: string[];
  attacks?: CardAttack[];
  weaknesses?: CardWeakness[];
  resistances?: CardResistance[];
  retreat?: number;
  rarity?: string;
  illustrator?: string;
  regulationMark?: string;
  rules?: string[];
  description?: string;
  stage?: string;
  evolvesFrom?: string;
  language: CardLanguage; // Language of fetched metadata/image
  availableVariants?: Partial<Record<CardVariant, boolean>>;
  isSecret?: boolean;
  pricing?: {
    brl?: { market?: number; low?: number; mid?: number; high?: number };
    usd?: { market?: number; low?: number; mid?: number; high?: number };
  };
}

export interface CollectionItem {
  id: string; // unique item id in collection store
  cardId: string; // Card API ID
  language: CardLanguage;
  variant: CardVariant;
  quantity: number;
  condition: CardCondition;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeckFormat = 'Standard' | 'Expanded' | 'Unlimited' | 'Casual' | string;

export interface DeckCard {
  cardId: string;
  quantity: number;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  format?: 'Standard' | 'Expanded' | 'Unlimited' | 'Pocket' | string;
  coverCardId?: string;
  cards: DeckCard[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  preferredLanguage: CardLanguage;
  theme: 'light' | 'dark';
  viewMode: 'grid' | 'binder' | 'list';
  autoSync: boolean;
}

export interface DeckValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  cardId?: string;
  cardName?: string;
}

export interface DeckValidationResult {
  isValid: boolean;
  totalCards: number;
  pokemonCount: number;
  trainerCount: number;
  energyCount: number;
  issues: DeckValidationIssue[];
}

export interface DeckCollectionStatus {
  cardId: string;
  cardName: string;
  required: number;
  owned: number;
  missing: number;
  card?: PokemonCard;
}

export interface CatalogValidationReport {
  totalCardsTested: number;
  missingImages: number;
  missingNumbers: number;
  missingSetInfo: number;
  duplicateIds: string[];
  inconsistentRecords: string[];
  timestamp: string;
}

export interface CatalogFilterOptions {
  searchQuery?: string;
  setId?: string;
  series?: string;
  type?: string;
  rarity?: string;
  artist?: string;
  language?: CardLanguage;
  ownedOnly?: boolean;
  unownedOnly?: boolean;
  favoritesOnly?: boolean;
  minQuantity?: number;
  sortBy?: 'number' | 'name' | 'rarity' | 'set';
  sortOrder?: 'asc' | 'desc';
}

// Third Evolution Platform Types

export type TransactionType = 'purchase' | 'sale';

export interface CardTransaction {
  id: string;
  cardId: string;
  cardName: string;
  setName?: string;
  variant: CardVariant;
  condition: CardCondition;
  type: TransactionType;
  quantity: number;
  unitPrice: number;
  date: string;
  buyerOrStore?: string;
  notes?: string;
  marketPriceAtTime?: number;
}

export interface PriceHistoryPoint {
  cardId: string;
  variant: CardVariant;
  price: number;
  source: string;
  timestamp: string;
}

export interface PriceConfidenceInfo {
  level: 'alta' | 'media' | 'baixa';
  sourceCount: number;
  lastUpdated: string;
  sources: {
    name: string;
    price: number;
    url?: string;
  }[];
  medianPrice: number;
}

export interface CollectionFinancialSummary {
  currentMarketValue: number;
  totalInvested: number;
  unrealizedProfit: number;
  unrealizedProfitPercentage: number;
  realizedProfit: number;
  totalSalesVolume: number;
  totalPurchasesCount: number;
  totalSalesCount: number;
}

export interface TopMarketMover {
  cardId: string;
  card?: PokemonCard;
  variant: CardVariant;
  currentPrice: number;
  investedPrice: number;
  changeValue: number;
  changePercentage: number;
}

export interface TradeCardItem {
  cardId: string;
  cardName: string;
  setName?: string;
  image?: string;
  variant: CardVariant;
  quantity: number;
  unitPrice: number;
}

export interface TradeProposal {
  id: string;
  title: string;
  traderName?: string;
  giveCards: TradeCardItem[];
  receiveCards: TradeCardItem[];
  giveTotalValue: number;
  receiveTotalValue: number;
  differenceValue: number;
  fairness: 'equilibrada' | 'vantajosa' | 'desfavoravel';
  status: 'rascunho' | 'concluida' | 'cancelada';
  createdAt: string;
  notes?: string;
}

export interface WishlistItem {
  cardId: string;
  cardName?: string;
  setName?: string;
  image?: string;
  variant: CardVariant;
  targetPrice?: number;
  currentMarketPrice?: number;
  priority: 'alta' | 'media' | 'baixa';
  addedAt: string;
  notes?: string;
}

export interface PhysicalDeckAllocation {
  deckId: string;
  deckName: string;
  quantityUsed: number;
}

export interface PhysicalCardAllocation {
  cardId: string;
  cardName: string;
  totalOwned: number;
  assignedToDecks: PhysicalDeckAllocation[];
  totalAssigned: number;
  availableSpare: number;
}

export interface CollectionTimelineEvent {
  id: string;
  type: 'card_added' | 'card_removed' | 'purchase' | 'sale' | 'trade' | 'deck_assignment' | 'price_alert';
  title: string;
  description: string;
  cardId?: string;
  cardName?: string;
  amount?: number;
  timestamp: string;
}

export * from './types/market';

