/**
 * linkedMarketPrice.test.ts - Tests for Hybrid Pricing System (Manual + Direct Links + On-Demand Update)
 */

import { LinkedMarketPriceService } from '../../services/pricing/LinkedMarketPriceService';
import { CardVariant, CardCondition } from '../../types';

// Mock localStorage for test environment
if (typeof localStorage === 'undefined' || !localStorage) {
  const store: Record<string, string> = {};
  global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() { return Object.keys(store).length; },
  } as any;
}

export function runLinkedMarketPriceTests() {
  const results: { name: string; passed: boolean; message?: string }[] = [];
  const cardId = 'sv03.5-010';
  const variant: CardVariant = 'holo';
  const condition: CardCondition = 'near_mint';

  // Clear storage for test
  localStorage.removeItem('pokebinder_card_market_links_v1');
  localStorage.removeItem('pokebinder_linked_prices_v1');
  localStorage.removeItem('pokebinder_price_history_v1');

  // Test 1: Domain Validation
  const valLigaValid = LinkedMarketPriceService.validateUrl('LIGA_POKEMON', 'https://www.ligapokemon.com.br/?view=cards/item&card=123');
  results.push({
    name: 'Liga Pokémon domain validation accepts valid ligapokemon.com.br URL',
    passed: valLigaValid.valid === true,
    message: `Expected valid, got error: ${valLigaValid.error}`,
  });

  const valLigaInvalid = LinkedMarketPriceService.validateUrl('LIGA_POKEMON', 'https://mypcards.com/pokemon/produto/123');
  results.push({
    name: 'Liga Pokémon domain validation rejects invalid domain',
    passed: valLigaInvalid.valid === false,
    message: 'Should have rejected non-ligapokemon URL',
  });

  const valMypValid = LinkedMarketPriceService.validateUrl('MYPCARDS', 'https://mypcards.com/pokemon/produto/205874/bulbasaur');
  results.push({
    name: 'MYPCards domain validation accepts valid mypcards.com URL',
    passed: valMypValid.valid === true,
    message: `Expected valid, got error: ${valMypValid.error}`,
  });

  // Test 2: Manual Price Setting & BRL Origin
  LinkedMarketPriceService.setManualPrice(cardId, variant, condition, 'LIGA_POKEMON', 0.50);
  LinkedMarketPriceService.setManualPrice(cardId, variant, condition, 'MYPCARDS', 0.80);

  const agg1 = LinkedMarketPriceService.getAggregatedLinkedPrice(cardId, variant, condition);
  results.push({
    name: 'Manual prices set correctly (Liga: 0.50, MYP: 0.80)',
    passed: agg1.ligaPrice === 0.50 && agg1.mypPrice === 0.80,
    message: `Got Liga: ${agg1.ligaPrice}, MYP: ${agg1.mypPrice}`,
  });

  results.push({
    name: 'Market Brasil price calculates lowest valid price (0.50)',
    passed: agg1.marketPrice === 0.50,
    message: `Expected 0.50, got ${agg1.marketPrice}`,
  });

  // Test 3: Save Link & History
  const saveLigaLink = LinkedMarketPriceService.saveLink(
    cardId,
    variant,
    condition,
    'LIGA_POKEMON',
    'https://www.ligapokemon.com.br/?view=cards/item&card=999'
  );
  results.push({
    name: 'Saving valid Liga Pokémon link succeeds',
    passed: saveLigaLink.success === true,
    message: saveLigaLink.error,
  });

  const savedLink = LinkedMarketPriceService.getLink(cardId, variant, condition, 'LIGA_POKEMON');
  results.push({
    name: 'Retrieved saved Liga link correctly',
    passed: savedLink?.url.includes('ligapokemon.com.br') === true,
  });

  // Test 4: History recording
  const history = LinkedMarketPriceService.getHistory(cardId, variant, condition, 'LIGA_POKEMON');
  results.push({
    name: 'History records manual price entry',
    passed: history.length > 0 && history[0].origin === 'MANUAL' && history[0].amount === 0.50,
  });

  return results;
}
