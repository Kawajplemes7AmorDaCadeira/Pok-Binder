import { createInternalCardId, createInternalPrintId, createInternalSetId, generateUUID, createExternalIds } from '../database/idUtils';
import { StorageService } from '../services/storage';

async function runPhase1Tests() {
  console.log('=== RUNNING FASE 1 (FUNDAÇÃO) AUTOMATED TESTS ===\n');
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

  // Test 1: ID Utility generation
  try {
    const cardId = createInternalCardId('Charizard ex');
    assert(cardId === 'PKB:CARD:charizard-ex', `Internal Card ID generated correctly: ${cardId}`);

    const printId = createInternalPrintId('sv03.5', '006', 'pt');
    assert(printId === 'PKB:PRINT:pt:sv03.5:006', `Internal CardPrint ID generated correctly: ${printId}`);

    const setId = createInternalSetId('sv03.5');
    assert(setId === 'PKB:SET:sv03.5', `Internal Set ID generated correctly: ${setId}`);

    const extIds = createExternalIds('sv03.5-006', 'tcg123');
    assert(extIds.tcgdex === 'sv03.5-006' && extIds.pokemonTcgApi === 'tcg123', 'ExternalIds object created correctly');

    const uuid = generateUUID();
    assert(typeof uuid === 'string' && uuid.length > 5, `UUID generated correctly: ${uuid}`);
  } catch (err) {
    assert(false, `ID Utils failed: ${err}`);
  }

  // Test 2: StorageService compatibility & initial state
  try {
    const collection = StorageService.getCollection();
    assert(Array.isArray(collection), 'StorageService.getCollection returns array');

    const decks = StorageService.getDecks();
    assert(Array.isArray(decks), 'StorageService.getDecks returns array');

    const favorites = StorageService.getFavorites();
    assert(Array.isArray(favorites), 'StorageService.getFavorites returns array');

    const settings = StorageService.getSettings();
    assert(settings.preferredLanguage === 'pt', 'StorageService.getSettings default language is pt');
  } catch (err) {
    assert(false, `StorageService test failed: ${err}`);
  }

  // Test 3: Export Backup format includes schemaVersion
  try {
    const backupJson = StorageService.exportFullBackupJSON();
    const parsed = JSON.parse(backupJson);
    assert(parsed.schemaVersion === 1, 'Full backup JSON contains schemaVersion = 1');
    assert(Array.isArray(parsed.collection), 'Backup contains collection array');
    assert(Array.isArray(parsed.decks), 'Backup contains decks array');
  } catch (err) {
    assert(false, `Backup export test failed: ${err}`);
  }

  console.log(`\n=== FASE 1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runPhase1Tests();
