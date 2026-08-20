import { TradeCardItem, TradeProposal } from '../../types';
import { StorageService } from '../storage';
import { InvestmentService } from '../investment/InvestmentService';

const TRADES_STORAGE_KEY = 'pokebinder_trades_v1';

export class TradeValueService {
  /**
   * Loads all saved trade proposals.
   */
  static getTrades(): TradeProposal[] {
    try {
      const raw = localStorage.getItem(TRADES_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Evaluates trade value balance and fairness.
   */
  static evaluateTrade(
    giveCards: TradeCardItem[],
    receiveCards: TradeCardItem[]
  ): {
    giveTotalValue: number;
    receiveTotalValue: number;
    differenceValue: number;
    fairness: 'equilibrada' | 'vantajosa' | 'desfavoravel';
  } {
    const giveTotalValue = Number(
      giveCards.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
    );

    const receiveTotalValue = Number(
      receiveCards.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
    );

    const differenceValue = Number((receiveTotalValue - giveTotalValue).toFixed(2));

    // Fairness calculation
    let fairness: 'equilibrada' | 'vantajosa' | 'desfavoravel' = 'equilibrada';

    if (giveTotalValue === 0 && receiveTotalValue === 0) {
      fairness = 'equilibrada';
    } else {
      const maxVal = Math.max(giveTotalValue, receiveTotalValue);
      const ratioDiff = maxVal > 0 ? Math.abs(differenceValue) / maxVal : 0;

      if (ratioDiff <= 0.08) {
        // within 8% is considered balanced / fair
        fairness = 'equilibrada';
      } else if (differenceValue > 0) {
        fairness = 'vantajosa';
      } else {
        fairness = 'desfavoravel';
      }
    }

    return {
      giveTotalValue,
      receiveTotalValue,
      differenceValue,
      fairness,
    };
  }

  /**
   * Saves or updates a trade proposal.
   */
  static saveTrade(proposal: Omit<TradeProposal, 'id' | 'createdAt' | 'giveTotalValue' | 'receiveTotalValue' | 'differenceValue' | 'fairness'> & { id?: string }): TradeProposal {
    const trades = this.getTrades();
    const evaluation = this.evaluateTrade(proposal.giveCards, proposal.receiveCards);

    const newProposal: TradeProposal = {
      ...proposal,
      id: proposal.id || `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...evaluation,
    };

    const existingIndex = trades.findIndex((t) => t.id === newProposal.id);
    let updated: TradeProposal[];

    if (existingIndex >= 0) {
      updated = [...trades];
      updated[existingIndex] = newProposal;
    } else {
      updated = [newProposal, ...trades];
    }

    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(updated));

    InvestmentService.addTimelineEvent({
      type: 'trade',
      title: `Negociação de troca salva: ${newProposal.title}`,
      description: `${newProposal.giveCards.length} cartas ofertadas por ${newProposal.receiveCards.length} cartas recebidas (${evaluation.fairness.toUpperCase()})`,
    });

    return newProposal;
  }

  /**
   * Marks a trade as completed and optionally updates collection stock.
   */
  static completeTrade(tradeId: string, applyStockChange: boolean = true): boolean {
    const trades = this.getTrades();
    const trade = trades.find((t) => t.id === tradeId);
    if (!trade) return false;

    trade.status = 'concluida';
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));

    if (applyStockChange) {
      // Deduct given cards
      trade.giveCards.forEach((g) => {
        StorageService.updateCardQuantity(g.cardId, -g.quantity, g.variant);
      });

      // Add received cards
      trade.receiveCards.forEach((r) => {
        StorageService.updateCardQuantity(r.cardId, r.quantity, r.variant);
      });
    }

    InvestmentService.addTimelineEvent({
      type: 'trade',
      title: `Troca Concluída: ${trade.title}`,
      description: `Troca finalizada com sucesso. Diferença de valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(trade.differenceValue)}`,
    });

    return true;
  }

  /**
   * Deletes a trade.
   */
  static deleteTrade(tradeId: string): void {
    const trades = this.getTrades().filter((t) => t.id !== tradeId);
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
  }
}
