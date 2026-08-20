import { InvestmentService } from '../services/pricing/InvestmentService';
import { PriceService } from '../services/pricing/PriceService';
import { CardMarketMatcher } from '../services/pricing/CardMarketMatcher';
import { CardPurchase, PokemonCard } from '../types';

export function runPricingAndInvestmentTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e?.message || String(e) });
    }
  }

  // 1. Median calculation test
  test('calculateMedian calculates correct odd and even medians', () => {
    const odd = PriceService.calculateMedian([10, 20, 30]);
    if (odd !== 20) throw new Error(`Expected 20, got ${odd}`);

    const even = PriceService.calculateMedian([10, 20, 30, 40]);
    if (even !== 25) throw new Error(`Expected 25, got ${even}`);
  });

  // 2. Outlier filtering test
  test('filterOutliers filters absurd spikes (e.g. R$ 700 in [15, 16, 15, 700])', () => {
    const list = [15, 16, 15, 700];
    const filtered = PriceService.filterOutliers(list);
    if (filtered.includes(700)) throw new Error('Outlier 700 was not filtered out');
    if (filtered.length !== 3) throw new Error(`Expected length 3, got ${filtered.length}`);
  });

  // 3. Investment formulas test (weighted average, total, profit/loss, ROI)
  test('InvestmentService computes weighted average and profit correctly', () => {
    const mockPurchases: CardPurchase[] = [
      {
        id: 'p1',
        cardId: 'sv03.5-011',
        variant: 'normal',
        condition: 'near_mint',
        quantity: 2,
        pricePerCard: 5.0,
        totalPaid: 10.0,
        currency: 'BRL',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'p2',
        cardId: 'sv03.5-011',
        variant: 'normal',
        condition: 'near_mint',
        quantity: 1,
        pricePerCard: 8.0,
        totalPaid: 8.0,
        currency: 'BRL',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'p3',
        cardId: 'sv03.5-011',
        variant: 'normal',
        condition: 'near_mint',
        quantity: 1,
        pricePerCard: 3.0,
        totalPaid: 3.0,
        currency: 'BRL',
        createdAt: new Date().toISOString(),
      },
    ];

    // Total invested: 10 + 8 + 3 = 21. Total quantity: 4. Average paid: 21 / 4 = 5.25
    const analysis = InvestmentService.calculateInvestment(mockPurchases, 7.9, 4, 'normal');

    if (analysis.totalInvested !== 21) throw new Error(`Expected 21, got ${analysis.totalInvested}`);
    if (analysis.averagePricePaid !== 5.25) throw new Error(`Expected 5.25, got ${analysis.averagePricePaid}`);
    if (analysis.currentEstimatedValue !== 31.6) throw new Error(`Expected 31.6, got ${analysis.currentEstimatedValue}`);
    if (analysis.totalProfitLoss !== 10.6) throw new Error(`Expected 10.6, got ${analysis.totalProfitLoss}`);
    if (!analysis.isProfit) throw new Error('Expected isProfit to be true');
    if (Math.round(analysis.roiPercentage!) !== 50) throw new Error(`Expected ~50.48% ROI, got ${analysis.roiPercentage}`);
  });

  // 4. Variant Isolation test
  test('Normal and Foil purchases never mix values or calculation', () => {
    const purchases: CardPurchase[] = [
      {
        id: 'p1',
        cardId: 'sv03.5-006',
        variant: 'normal',
        condition: 'near_mint',
        quantity: 3,
        pricePerCard: 4.0,
        totalPaid: 12.0,
        currency: 'BRL',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'p2',
        cardId: 'sv03.5-006',
        variant: 'holo',
        condition: 'near_mint',
        quantity: 1,
        pricePerCard: 18.0,
        totalPaid: 18.0,
        currency: 'BRL',
        createdAt: new Date().toISOString(),
      },
    ];

    const normalOnly = purchases.filter((p) => p.variant === 'normal');
    const holoOnly = purchases.filter((p) => p.variant === 'holo');

    const normalAnalysis = InvestmentService.calculateInvestment(normalOnly, 6.0, 3, 'normal');
    const holoAnalysis = InvestmentService.calculateInvestment(holoOnly, 25.0, 1, 'holo');

    if (normalAnalysis.averagePricePaid !== 4.0) throw new Error('Normal average corrupted by Holo');
    if (holoAnalysis.averagePricePaid !== 18.0) throw new Error('Holo average corrupted by Normal');
  });

  // 5. CardMarketMatcher confidence test
  test('CardMarketMatcher scores confident match on identical card metadata', () => {
    const mockCard: PokemonCard = {
      id: 'sv03.5-011',
      localId: '011',
      name: 'Fennekin',
      setId: 'sv03.5',
      setName: '151',
      language: 'pt',
    };

    const match = CardMarketMatcher.computeConfidenceScore(
      {
        name: 'Fennekin',
        setName: '151',
        localId: '011',
        variant: 'normal',
      },
      mockCard,
      'normal'
    );

    if (match.score < 90) throw new Error(`Expected score >= 90, got ${match.score}`);
    if (!match.isConfident) throw new Error('Expected isConfident to be true');
  });

  return results;
}
