import { SetSyncService } from '../services/setSyncService';
import { CatalogDiagnosticService } from '../services/catalog/catalogDiagnosticService';
import { applyCatalogOverrides, CATALOG_OVERRIDES } from '../services/catalog/catalogOverrides';
import { db } from '../database/database';
import { CardSet, PokemonCard } from '../types';

async function runPhase2Tests() {
  console.log('=== RUNNING FASE 2 (CATÁLOGO DINÂMICO & SYNC) AUTOMATED TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Catalog Overrides application
  try {
    const rawSets: CardSet[] = [
      {
        id: 'me04',
        name: 'Uncorrected Name',
        series: 'Unknown Series',
        cardCount: { official: 100, total: 100 },
      },
      {
        id: 'normal_set',
        name: 'Normal Expansion',
        series: 'Escarlate e Violeta',
        cardCount: { official: 100, total: 100 },
      },
    ];

    const overridden = applyCatalogOverrides(rawSets);
    const me04Overridden = overridden.find((s) => s.id === 'me04');
    assert(
      me04Overridden !== undefined && me04Overridden.name === 'Megaevolução — Equilíbrio Perfeito',
      `Catalog Override correctly applied corrected name: ${me04Overridden?.name}`
    );
    assert(
      me04Overridden?.releaseDate === '2026-03-27',
      `Catalog Override correctly applied release date: ${me04Overridden?.releaseDate}`
    );
  } catch (err) {
    assert(false, `Catalog Overrides test failed: ${err}`);
  }

  // Test 2: Quick Sync discovery & Override integration
  try {
    const sets = await SetSyncService.quickSync('pt');
    assert(Array.isArray(sets) && sets.length > 10, `Quick Sync discovered ${sets.length} expansions`);

    const me05 = sets.find((s) => s.id === 'me05');
    assert(me05 !== undefined && me05.series === 'Megaevolução', 'Megaevolução series expansion detected');
  } catch (err) {
    assert(false, `Quick Sync test failed: ${err}`);
  }

  // Test 3: Catalog Diagnostic Service — Image relation & duplicate detection
  try {
    const mockCards: PokemonCard[] = [
      {
        id: 'c1',
        name: 'Charizard ex',
        setId: 'me04',
        setName: 'Equilíbrio Perfeito',
        localId: '001',
        rarity: 'Rare Holo',
        image: 'https://assets.tcgdex.net/pt/sv/sv09/001/high.png',
        language: 'pt',
        availableVariants: { normal: true, reverse: true, holo: false, firstEdition: false },
      },
      {
        id: 'c2',
        name: 'Pikachu',
        setId: 'me04',
        setName: 'Equilíbrio Perfeito',
        localId: '002',
        rarity: 'Common',
        image: 'https://assets.tcgdex.net/pt/sv/sv09/002/high.png',
        language: 'pt',
        availableVariants: { normal: true, reverse: true, holo: false, firstEdition: false },
      },
      {
        id: 'c1', // Duplicate ID
        name: 'Charizard ex Duplicate',
        setId: 'me04',
        setName: 'Equilíbrio Perfeito',
        localId: '001', // Duplicate collector number
        rarity: 'Rare Holo',
        image: '', // Missing image
        language: 'pt',
        availableVariants: { normal: true, reverse: true, holo: false, firstEdition: false },
      },
    ];

    const validImage = CatalogDiagnosticService.validateCardImageRelation(mockCards[0]);
    assert(validImage === true, 'Card image relation valid for card 1');

    const invalidImage = CatalogDiagnosticService.validateCardImageRelation(mockCards[2]);
    assert(invalidImage === false, 'Card image relation invalid for card with missing image');

    const dupIds = CatalogDiagnosticService.checkDuplicateCards(mockCards);
    assert(dupIds.length === 1, `Duplicate card ID detected: ${dupIds.length}`);

    const dupNums = CatalogDiagnosticService.checkDuplicateCollectorNumbers(mockCards);
    assert(dupNums.length === 1, `Duplicate collector number detected: ${dupNums.length}`);

    const mockSet: CardSet = {
      id: 'me04',
      name: 'Equilíbrio Perfeito',
      series: 'Megaevolução',
      cardCount: { official: 100, total: 100 },
    };
    const analysis = CatalogDiagnosticService.analyzeSet(mockSet, mockCards);
    assert(analysis.missingImagesCount === 1, `Diagnostic analysis counted missing images: ${analysis.missingImagesCount}`);
  } catch (err) {
    assert(false, `Catalog Diagnostic test failed: ${err}`);
  }

  // Test 4: IndexedDB Catalog Versioning snapshot
  try {
    const versions = await db.catalogVersions.toArray();
    assert(Array.isArray(versions), 'Catalog versions array readable from Dexie');
  } catch (err) {
    assert(false, `Catalog Versioning test failed: ${err}`);
  }

  console.log(`\n=== FASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runPhase2Tests();
