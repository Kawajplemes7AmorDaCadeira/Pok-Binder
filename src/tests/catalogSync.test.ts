import { SetSyncService } from '../services/setSyncService';
import { CardProvider } from '../services/cardProvider';

export async function runCatalogSyncTests() {
  console.log('=== RUNNING CATALOG SYNC AUTOMATED TESTS ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✕ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: Multiple sets discovery
    const sets = await SetSyncService.getAvailableSets('pt');
    assert(sets.length > 1, `Catalog returns multiple expansions (Found: ${sets.length})`);

    // TEST 2: 2025 sets presence
    const sets2025 = sets.filter((s) => s.releaseDate && new Date(s.releaseDate).getFullYear() === 2025);
    assert(sets2025.length > 0, `2025 expansions found in catalog (Found: ${sets2025.length})`);

    // TEST 3: 2026 sets presence
    const sets2026 = sets.filter((s) => s.releaseDate && new Date(s.releaseDate).getFullYear() === 2026);
    assert(sets2026.length > 0, `2026 expansions found in catalog (Found: ${sets2026.length})`);

    // TEST 4: Megaevolução series presence
    const megaSeriesSets = sets.filter((s) => s.series === 'Megaevolução');
    assert(
      megaSeriesSets.length >= 3,
      `Megaevolução series expansions present (Found: ${megaSeriesSets.length})`
    );

    // TEST 5: Equilíbrio Perfeito set exists
    const equilibrioSet = sets.find((s) => s.name.includes('Equilíbrio Perfeito'));
    assert(!!equilibrioSet, 'Megaevolução — Equilíbrio Perfeito set identified');

    // TEST 6: Card retrieval for Equilíbrio Perfeito
    if (equilibrioSet) {
      const cards = await SetSyncService.syncCardsForSet(equilibrioSet.id, 'pt');
      assert(cards.length > 0, `Cards synchronized for Equilíbrio Perfeito (Found: ${cards.length})`);
    }

    // TEST 7: Multi-expansion search for "Mewtwo"
    const searchRes = await CardProvider.searchCards({ searchQuery: 'Mewtwo' }, 'pt');
    assert(
      searchRes.cards.length >= 2,
      `Global catalog search for Mewtwo finds multiple versions across expansions (Found: ${searchRes.cards.length})`
    );

    // TEST 8: Set validation diagnostic tool test
    const validationRes = await SetSyncService.validateSet('sv09.5', 'pt');
    assert(validationRes.isValid, `Validation for set sv09.5 (Rivais Predestinados) succeeded`);

    console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
    return { passed, failed };
  } catch (err) {
    console.error('Test execution error:', err);
    return { passed, failed: failed + 1 };
  }
}

// Run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('catalogSync.test')) {
  runCatalogSyncTests();
}
