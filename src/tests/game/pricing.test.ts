/**
 * pricing.test.ts - Regression unit tests for PriceAuditService and PriceService.
 */

import { PriceAuditService } from '../../services/pricing/PriceAuditService';
import { PriceService } from '../../services/pricing/PriceService';
import { PokemonCard } from '../../types';

export function runPricingTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e?.message || String(e) });
    }
  }

  const mockHoOh: PokemonCard = {
    id: 'cri-10',
    localId: '010/086',
    name: 'Ho-Oh',
    setId: 'cri',
    setName: 'Equilíbrio Perfeito',
    rarity: 'Rare',
    language: 'pt',
  };

  test('1. Ho-Oh 010/086 Holo NM pricing trace uses lowest Brazil price and ignores TCGPlayer', () => {
    const trace = PriceAuditService.auditPrice(mockHoOh, 'holo', 'near_mint', 'pt', [
      {
        source: 'LIGA_POKEMON',
        listings: [
          { rawPrice: 'R$ 0,45', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
          { rawPrice: 'R$ 0,50', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
          { rawPrice: 'R$ 0,55', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
          { rawPrice: 'R$ 0,60', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
        ],
      },
      {
        source: 'MYPCARDS',
        listings: [
          { rawPrice: 'R$ 0,90', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
          { rawPrice: 'R$ 1,00', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
          { rawPrice: 'R$ 1,20', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
        ],
      },
      {
        source: 'TCGPLAYER',
        listings: [
          { rawPrice: '$6.00', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'en' },
        ],
      },
    ]);

    if (trace.referencePrice !== 0.45) {
      throw new Error(`Expected lowest Brazil reference price = 0.45, got ${trace.referencePrice}`);
    }
    if (trace.origin !== 'REAL_LISTING') {
      throw new Error('Expected origin REAL_LISTING');
    }
  });

  test('2. Outlier rejection successfully flags extreme prices', () => {
    const prices = [0.50, 0.55, 0.60, 15.00];
    const { accepted, rejected } = PriceAuditService.filterOutliers(prices);
    if (!accepted.includes(0.50) || !accepted.includes(0.60)) {
      throw new Error('Valid prices were incorrectly rejected.');
    }
    if (!rejected.includes(15.00)) {
      throw new Error('Outlier 15.00 was not rejected.');
    }
  });

  test('3. Variant and collector number mismatch rejection works correctly', () => {
    const target = {
      name: 'Ho-Oh',
      setId: 'cri',
      collectorNumber: '010/086',
      variant: 'HOLO' as const,
      condition: 'NEAR_MINT' as const,
      language: 'pt',
    };

    const wrongListing = {
      cardName: 'Ho-Oh',
      setName: 'cri',
      collectorNumber: '191/191',
      variant: 'NORMAL' as const,
      condition: 'NEAR_MINT' as const,
      language: 'pt',
    };

    const match = PriceAuditService.computeMatchScore(target, wrongListing);
    if (!match.reasons.includes('WRONG_COLLECTOR_NUMBER') || !match.reasons.includes('WRONG_VARIANT')) {
      throw new Error(`Expected rejection reasons, got ${match.reasons.join(', ')}`);
    }
  });

  return results;
}
