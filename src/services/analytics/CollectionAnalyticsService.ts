import { CollectionItem, PokemonCard, PhysicalCardAllocation, WishlistItem, Deck } from '../../types';
import { StorageService } from '../storage';
import { PriceService } from '../pricing/PriceService';

export interface InsightItem {
  id: string;
  type: 'expansion_progress' | 'duplicates' | 'top_value' | 'deck_conflict' | 'wishlist_deal' | 'portfolio_growth';
  title: string;
  description: string;
  badge?: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel?: string;
  actionTarget?: string;
}

export class CollectionAnalyticsService {
  /**
   * Computes physical card allocations across all registered decks.
   */
  static getPhysicalCardAllocations(
    collection: CollectionItem[],
    cardMap: Record<string, PokemonCard>
  ): {
    allocations: PhysicalCardAllocation[];
    conflictsCount: number;
    totalAssignedInDecks: number;
  } {
    const decks: Deck[] = StorageService.getDecks();
    const cardUsageMap = new Map<
      string,
      {
        cardName: string;
        totalOwned: number;
        assignedToDecks: { deckId: string; deckName: string; quantityUsed: number }[];
      }
    >();

    // Initialize with owned collection quantities
    collection.forEach((item) => {
      const card = cardMap[item.cardId];
      const name = card?.name || item.cardId;
      const existing = cardUsageMap.get(item.cardId) || {
        cardName: name,
        totalOwned: 0,
        assignedToDecks: [],
      };
      existing.totalOwned += item.quantity;
      cardUsageMap.set(item.cardId, existing);
    });

    // Populate usage from decks
    decks.forEach((deck) => {
      // Only check if deck has cards
      if (deck.cards && deck.cards.length > 0) {
        deck.cards.forEach((deckCard) => {
          const existing = cardUsageMap.get(deckCard.cardId) || {
            cardName: cardMap[deckCard.cardId]?.name || deckCard.cardId,
            totalOwned: 0,
            assignedToDecks: [],
          };
          existing.assignedToDecks.push({
            deckId: deck.id,
            deckName: deck.name,
            quantityUsed: deckCard.quantity,
          });
          cardUsageMap.set(deckCard.cardId, existing);
        });
      }
    });

    let conflictsCount = 0;
    let totalAssignedInDecks = 0;

    const allocations: PhysicalCardAllocation[] = Array.from(cardUsageMap.entries()).map(
      ([cardId, data]) => {
        const totalAssigned = data.assignedToDecks.reduce((sum, d) => sum + d.quantityUsed, 0);
        const availableSpare = Math.max(0, data.totalOwned - totalAssigned);

        if (totalAssigned > data.totalOwned) {
          conflictsCount += 1;
        }
        totalAssignedInDecks += totalAssigned;

        return {
          cardId,
          cardName: data.cardName,
          totalOwned: data.totalOwned,
          assignedToDecks: data.assignedToDecks,
          totalAssigned,
          availableSpare,
        };
      }
    );

    return {
      allocations,
      conflictsCount,
      totalAssignedInDecks,
    };
  }

  /**
   * Generates deterministic, algorithm-driven insights.
   */
  static generateInsights(
    collection: CollectionItem[],
    cardMap: Record<string, PokemonCard>,
    wishlist: WishlistItem[] = []
  ): InsightItem[] {
    const insights: InsightItem[] = [];

    if (collection.length === 0) {
      return [
        {
          id: 'insight_empty',
          type: 'portfolio_growth',
          title: 'Comece seu fichário digital',
          description: 'Adicione suas primeiras cartas no catálogo para acompanhar valor de mercado e completude de expansões.',
          priority: 'high',
          actionLabel: 'Explorar Catálogo',
          actionTarget: 'catalog',
        },
      ];
    }

    // 1. Expansion Near-Completion Insight
    const setCounts = new Map<string, { name: string; owned: number; total: number }>();
    collection.forEach((item) => {
      const card = cardMap[item.cardId];
      if (card && card.setId) {
        const existing = setCounts.get(card.setId) || {
          name: card.setName || card.setId,
          owned: 0,
          total: card.setTotalCards || 100,
        };
        existing.owned += 1;
        setCounts.set(card.setId, existing);
      }
    });

    const setsList = Array.from(setCounts.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      owned: data.owned,
      total: data.total,
      remaining: Math.max(0, data.total - data.owned),
      percentage: Math.round((data.owned / data.total) * 100),
    }));

    const nearCompleteSet = setsList
      .filter((s) => s.remaining > 0 && s.percentage >= 60)
      .sort((a, b) => a.remaining - b.remaining)[0];

    if (nearCompleteSet) {
      insights.push({
        id: 'insight_near_complete',
        type: 'expansion_progress',
        title: `Quase lá: ${nearCompleteSet.name}`,
        description: `Faltam apenas ${nearCompleteSet.remaining} cartas (${nearCompleteSet.percentage}% concluído) para completar este set.`,
        badge: `${nearCompleteSet.percentage}% Concluído`,
        priority: 'high',
        actionLabel: 'Ver Faltantes',
        actionTarget: 'missing',
      });
    }

    // 2. Duplicates Insight for Trading
    const duplicatesCount = collection.reduce(
      (sum, item) => sum + (item.quantity > 1 ? item.quantity - 1 : 0),
      0
    );

    if (duplicatesCount > 0) {
      insights.push({
        id: 'insight_duplicates',
        type: 'duplicates',
        title: `${duplicatesCount} cartas duplicadas disponíveis`,
        description: 'Você possui cartas repetidas que podem ser usadas para trocas vantajosas ou venda.',
        badge: `${duplicatesCount} para troca`,
        priority: 'medium',
        actionLabel: 'Abrir Trocas',
        actionTarget: 'trades',
      });
    }

    // 3. Most Valuable Card
    let mostValuableCard: { name: string; price: number } | null = null;
    collection.forEach((item) => {
      const card = cardMap[item.cardId];
      if (card) {
        const price = PriceService.getCardMarketPrice(card, item.variant, item.condition);
        if (!mostValuableCard || price > mostValuableCard.price) {
          mostValuableCard = { name: card.name, price };
        }
      }
    });

    if (mostValuableCard && (mostValuableCard as { price: number }).price > 15) {
      insights.push({
        id: 'insight_top_card',
        type: 'top_value',
        title: `Destaque: ${mostValuableCard.name}`,
        description: `Sua carta mais valiosa da coleção está cotada em ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mostValuableCard.price)}.`,
        badge: 'Top Colecionável',
        priority: 'medium',
        actionLabel: 'Ver no Mercado',
        actionTarget: 'market',
      });
    }

    // 4. Physical Deck Allocation Conflict
    const { conflictsCount } = this.getPhysicalCardAllocations(collection, cardMap);
    if (conflictsCount > 0) {
      insights.push({
        id: 'insight_deck_conflict',
        type: 'deck_conflict',
        title: `Conflito de ${conflictsCount} cartas físicas em decks`,
        description: 'Você tem cartas alocadas em múltiplos decks físicos acima da quantidade de cópias que possui no fichário.',
        badge: 'Aviso Físico',
        priority: 'high',
        actionLabel: 'Meus Decks',
        actionTarget: 'decks',
      });
    }

    return insights;
  }
}
