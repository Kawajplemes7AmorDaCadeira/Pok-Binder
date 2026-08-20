import { CollectionService } from '../services/collection/collectionService';
import { CollectionRepository } from '../database/repositories/CollectionRepository';
import { StorageService } from '../services/storage';

async function runPhase3Tests() {
  console.log('=== RUNNING FASE 3 (COLEÇÃO AVANÇADA & ESTATÍSTICAS) AUTOMATED TESTS ===\n');
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

  // Test 1: CRUD & Multiple Item Entries for Same Card (Different Variants/Conditions)
  try {
    // Clear repository state first
    await CollectionRepository.clearAll();

    // Add NM Normal Charizard
    const item1 = await CollectionService.addItem({
      cardPrintId: 'PKB:PRINT:pt:sv03.5:006',
      quantity: 2,
      condition: 'near_mint',
      variant: 'normal',
      language: 'pt',
      acquiredPrice: 50.0,
      notes: 'Looted from pack',
      location: 'Binder 1',
    });
    assert(item1.id !== undefined, `Item 1 created with ID: ${item1.id}`);

    // Add HP Foil Charizard (same card, different condition & variant)
    const item2 = await CollectionService.addItem({
      cardPrintId: 'PKB:PRINT:pt:sv03.5:006',
      quantity: 1,
      condition: 'heavily_played',
      variant: 'holo',
      language: 'en',
      acquiredPrice: 30.0,
      notes: 'Traded with friend',
      location: 'Deck Box A',
    });
    assert(item2.id !== undefined && item2.id !== item1.id, `Item 2 created with unique ID: ${item2.id}`);

    const allItems = await CollectionRepository.getAll();
    assert(allItems.length === 2, `Repository holds 2 distinct items for the same card print ID`);
  } catch (err) {
    assert(false, `Collection CRUD test failed: ${err}`);
  }

  // Test 2: Item Updates & Bulk Deletion
  try {
    const allItems = await CollectionRepository.getAll();
    const targetId = allItems[0].id;

    const updated = await CollectionService.updateItem(targetId, {
      quantity: 5,
      notes: 'Updated note via service',
    });
    assert(updated !== null && updated.quantity === 5 && updated.notes === 'Updated note via service', 'Item updated successfully');

    const deletedCount = await CollectionService.bulkDelete([allItems[1].id]);
    assert(deletedCount === 1, 'Bulk delete removed 1 item');

    const remaining = await CollectionRepository.getAll();
    assert(remaining.length === 1 && remaining[0].quantity === 5, 'Remaining collection item verified');
  } catch (err) {
    assert(false, `Update & Bulk Delete test failed: ${err}`);
  }

  // Test 3: Advanced Filtering & Sorting
  try {
    await CollectionRepository.clearAll();

    await CollectionService.addItem({ cardPrintId: 'PKB:PRINT:pt:sv03.5:001', quantity: 3, variant: 'normal', condition: 'near_mint', language: 'pt', acquiredPrice: 10.0 });
    await CollectionService.addItem({ cardPrintId: 'PKB:PRINT:pt:sv03.5:002', quantity: 1, variant: 'holo', condition: 'lightly_played', language: 'en', acquiredPrice: 25.0 });
    await CollectionService.addItem({ cardPrintId: 'PKB:PRINT:pt:me04:010', quantity: 2, variant: 'reverse', condition: 'near_mint', language: 'pt', acquiredPrice: 15.0 });

    const currentItems = await CollectionRepository.getAll();

    const filteredSet = CollectionService.filterCollection(currentItems, { setId: 'sv03.5' });
    assert(filteredSet.length === 2, `Filtered by set 'sv03.5': ${filteredSet.length} items`);

    const filteredHolo = CollectionService.filterCollection(currentItems, { variant: 'holo' });
    assert(filteredHolo.length === 1, `Filtered by variant 'holo': ${filteredHolo.length} item`);

    const filteredPrice = CollectionService.filterCollection(currentItems, { minPrice: 20.0 });
    assert(filteredPrice.length === 1, `Filtered by minPrice 20.0: ${filteredPrice.length} item`);
  } catch (err) {
    assert(false, `Filter & Sort test failed: ${err}`);
  }

  // Test 4: Calculation of Stats & Expansion Progress
  try {
    const currentItems = await CollectionRepository.getAll();
    const setsInfo = [
      { id: 'sv03.5', name: 'Pokémon 151', series: 'Escarlate e Violeta', totalCards: 165 },
      { id: 'me04', name: 'Megaevolução — Equilíbrio Perfeito', series: 'Megaevolução', totalCards: 100 },
    ];

    const stats = CollectionService.calculateStats(currentItems, undefined, setsInfo);
    assert(stats.totalItemsQuantity === 6, `Total items quantity calculated: ${stats.totalItemsQuantity}`);
    assert(stats.totalUniqueCards === 3, `Total unique card prints calculated: ${stats.totalUniqueCards}`);
    assert(stats.totalEstimatedValue === 85.0, `Total estimated value calculated: R$ ${stats.totalEstimatedValue}`);

    const set1Progress = stats.expansionProgress.find((p) => p.setId === 'sv03.5');
    assert(set1Progress !== undefined && set1Progress.uniqueCardsOwned === 2, `Expansion completion unique cards tracked: ${set1Progress?.uniqueCardsOwned}`);
  } catch (err) {
    assert(false, `Stats calculation test failed: ${err}`);
  }

  // Test 5: Export CSV / Full Backup
  try {
    const backupJson = StorageService.exportFullBackupJSON();
    const parsed = JSON.parse(backupJson);
    assert(parsed.schemaVersion === 1, 'Exported backup contains valid schemaVersion');

    const csv = StorageService.exportCollectionCSV();
    assert(typeof csv === 'string' && csv.includes('card_id,name,set'), 'Exported CSV contains proper headers');
  } catch (err) {
    assert(false, `Export test failed: ${err}`);
  }

  console.log(`\n=== FASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runPhase3Tests();
