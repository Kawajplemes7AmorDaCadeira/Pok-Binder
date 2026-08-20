/**
 * brazilianCurrencyRegression.test.ts - Unit and regression tests verifying currency integrity.
 * Guarantees that Liga Pokémon and MYPCards prices are NEVER converted via FX or multiplied by exchange rates.
 */

import { BrazilianPriceParser } from '../../services/pricing/BrazilianPriceParser';
import { CurrencyConversionService } from '../../services/pricing/CurrencyConversionService';
import { PriceAuditService, BRAZIL_PRICE_POLICY_VERSION } from '../../services/pricing/PriceAuditService';
import { PokemonCard } from '../../types';

export function runBrazilianCurrencyRegressionTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e?.message || String(e) });
    }
  }

  // 1. Brazilian Parser Decimal Tests
  test('1. BrazilianPriceParser handles comma, dot and currency symbol formats accurately', () => {
    const p1 = BrazilianPriceParser.parseBrazilianCurrency('R$ 0,50');
    if (p1.amount !== 0.50 || p1.currency !== 'BRL') {
      throw new Error(`Expected 0.50 BRL, got ${p1.amount} ${p1.currency}`);
    }

    const p2 = BrazilianPriceParser.parseBrazilianCurrency('R$0,50');
    if (p2.amount !== 0.50) throw new Error(`Failed on R$0,50`);

    const p3 = BrazilianPriceParser.parseBrazilianCurrency('0,50');
    if (p3.amount !== 0.50) throw new Error(`Failed on 0,50`);

    const p4 = BrazilianPriceParser.parseBrazilianCurrency('1.234,56');
    if (p4.amount !== 1234.56) throw new Error(`Expected 1234.56, got ${p4.amount}`);

    const p5 = BrazilianPriceParser.parseBrazilianCurrency('R$ 1.234,56');
    if (p5.amount !== 1234.56) throw new Error(`Expected 1234.56, got ${p5.amount}`);

    const p6 = BrazilianPriceParser.parseBrazilianCurrency('2,78');
    if (p6.amount !== 2.78) throw new Error(`Expected 2.78, got ${p6.amount}`);

    const p7 = BrazilianPriceParser.parseBrazilianCurrency(2.78);
    if (p7.amount !== 2.78) throw new Error(`Expected 2.78 from number, got ${p7.amount}`);
  });

  // 2. USD Parser Tests
  test('2. BrazilianPriceParser parseUSDPrice parses foreign currencies with USD tag', () => {
    const u1 = BrazilianPriceParser.parseUSDPrice('$1.20');
    if (u1.amount !== 1.20 || u1.currency !== 'USD') {
      throw new Error(`Expected 1.20 USD, got ${u1.amount} ${u1.currency}`);
    }

    const u2 = BrazilianPriceParser.parseUSDPrice('1.20 USD');
    if (u2.amount !== 1.20 || u2.currency !== 'USD') {
      throw new Error(`Expected 1.20 USD, got ${u2.amount}`);
    }

    const u3 = BrazilianPriceParser.parseUSDPrice('1,234.56');
    if (u3.amount !== 1234.56 || u3.currency !== 'USD') {
      throw new Error(`Expected 1234.56 USD, got ${u3.amount}`);
    }
  });

  // 3. CurrencyConversionService Guard Clauses
  test('3. CurrencyConversionService does NOT convert BRL to BRL (0 conversions)', () => {
    CurrencyConversionService.resetCallCount();

    const brlMoney = { amount: 0.50, currency: 'BRL' as const };
    const res = CurrencyConversionService.convert(brlMoney, 'BRL');

    if (res.amount !== 0.50 || res.currency !== 'BRL') {
      throw new Error(`Expected 0.50 BRL, got ${res.amount}`);
    }
    if (CurrencyConversionService.convertCallsCount !== 0) {
      throw new Error(`convertCallsCount should be 0 for BRL->BRL, got ${CurrencyConversionService.convertCallsCount}`);
    }
  });

  // 4. CurrencyConversionService USD->BRL
  test('4. CurrencyConversionService converts USD to BRL when explicitly requested', () => {
    CurrencyConversionService.resetCallCount();

    const usdMoney = { amount: 1.20, currency: 'USD' as const };
    const res = CurrencyConversionService.convert(usdMoney, 'BRL');

    if (res.currency !== 'BRL') throw new Error('Expected BRL output');
    if (res.amount !== Number((1.20 * 5.50).toFixed(2))) {
      throw new Error(`Expected ${(1.20 * 5.50).toFixed(2)}, got ${res.amount}`);
    }
    if (CurrencyConversionService.convertCallsCount !== 1) {
      throw new Error(`Expected exactly 1 conversion call, got ${CurrencyConversionService.convertCallsCount}`);
    }
  });

  // 5. Ho-Oh 010/086 Holo NM Audit & Zero FX Conversion for Brazil Sources
  test('5. Ho-Oh 010/086 Holo NM uses lowest valid Brazil listing with 0 FX conversions for Liga/MYP', () => {
    CurrencyConversionService.resetCallCount();

    const mockHoOh: PokemonCard = {
      id: 'cri-10',
      localId: '010/086',
      name: 'Ho-Oh',
      setId: 'cri',
      setName: 'Equilíbrio Perfeito',
      rarity: 'Rare',
      language: 'pt',
    };

    const trace = PriceAuditService.auditPrice(mockHoOh, 'holo', 'near_mint', 'pt', [
      {
        source: 'LIGA_POKEMON',
        listings: [
          { rawPrice: 'R$ 0,50', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
          { rawPrice: 'R$ 0,60', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
        ],
      },
      {
        source: 'MYPCARDS',
        listings: [
          { rawPrice: 'R$ 1,20', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
          { rawPrice: 'R$ 1,30', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'pt' },
        ],
      },
      {
        source: 'TCGPLAYER',
        listings: [
          { rawPrice: '$1.50', cardName: 'Ho-Oh', setName: 'cri', collectorNumber: '010/086', variant: 'HOLO', condition: 'NEAR_MINT', language: 'en' },
        ],
      },
    ]);

    // Check lowest valid Brazil price (0.50 BRL from Liga)
    if (trace.referencePrice !== 0.50) {
      throw new Error(`Expected Brazil referencePrice = 0.50, got ${trace.referencePrice}`);
    }

    if (trace.origin !== 'REAL_LISTING') {
      throw new Error(`Expected origin REAL_LISTING, got ${trace.origin}`);
    }

    // Verify Liga & MYP traces did not apply FX conversion
    const ligaTrace = trace.sources.find((s) => s.source === 'LIGA_POKEMON');
    const mypTrace = trace.sources.find((s) => s.source === 'MYPCARDS');

    if (ligaTrace?.conversionApplied) {
      throw new Error('Liga Pokémon trace incorrectly flagged conversionApplied as true!');
    }
    if (mypTrace?.conversionApplied) {
      throw new Error('MYPCards trace incorrectly flagged conversionApplied as true!');
    }

    if (ligaTrace?.lowest !== 0.50) {
      throw new Error(`Expected Liga lowest = 0.50, got ${ligaTrace?.lowest}`);
    }
    if (mypTrace?.lowest !== 1.20) {
      throw new Error(`Expected MYP lowest = 1.20, got ${mypTrace?.lowest}`);
    }
  });

  // 6. Policy Version Verification
  test('6. Policy version is strictly updated', () => {
    if (BRAZIL_PRICE_POLICY_VERSION < 6) {
      throw new Error(`Expected BRAZIL_PRICE_POLICY_VERSION >= 6, got ${BRAZIL_PRICE_POLICY_VERSION}`);
    }
  });

  // 7. Blastoise ex (009/165) Real Listing Acceptance Test
  test('7. Blastoise ex (009/165) accepted listings and price loaded without being unavailable', () => {
    const blastoise: PokemonCard = {
      id: 'sv03.5-009',
      localId: '009/165',
      name: 'Blastoise ex',
      setId: 'sv03.5',
      setName: '151',
      setTotalCards: 165,
      rarity: 'Double Rare',
      language: 'pt',
    };
    const trace = PriceAuditService.auditPrice(blastoise, 'normal', 'near_mint', 'pt');
    if (!trace.referencePrice || trace.referencePrice <= 0) {
      throw new Error(`Expected valid reference price for Blastoise ex, got ${trace.referencePrice}`);
    }
    if (trace.origin !== 'REAL_LISTING') {
      throw new Error(`Expected origin REAL_LISTING for Blastoise ex, got ${trace.origin}`);
    }
  });

  return results;
}
