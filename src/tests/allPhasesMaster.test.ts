import { createInternalCardId, generateUUID } from '../database/idUtils';
import { StorageService } from '../services/storage';
import { SetSyncService } from '../services/setSyncService';
import { CatalogDiagnosticService } from '../services/catalog/catalogDiagnosticService';
import { CollectionService } from '../services/collection/collectionService';
import { CollectionRepository } from '../database/repositories/CollectionRepository';
import { DeckService } from '../services/deck/deckService';
import { DeckRepository } from '../database/repositories/DeckRepository';
import { FinancialService } from '../services/financial/financialService';
import { WishlistRepository } from '../database/repositories/WishlistRepository';
import { TradeRepository } from '../database/repositories/TradeRepository';
import { SyncEngine } from '../services/sync/syncEngine';
import { BackupService } from '../services/backup/backupService';
import { AdminDashboardService } from '../services/admin/adminDashboardService';

async function runMasterTestRunner() {
  console.log('===========================================================');
  console.log('🚀 RUNNING MASTER AUTOMATED VALIDATION SUITE (ALL PHASES)');
  console.log('===========================================================\n');

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

  // --- FASE 1: FUNDAÇÃO ---
  console.log('--- FASE 1: FUNDAÇÃO & PERSISTÊNCIA ---');
  try {
    const cardId = createInternalCardId('Mewtwo ex');
    assert(cardId === 'PKB:CARD:mewtwo-ex', 'Phase 1: ID Utility generation verified');

    const uuid = generateUUID();
    assert(typeof uuid === 'string' && uuid.length > 10, 'Phase 1: UUID generator verified');

    const settings = StorageService.getSettings();
    assert(settings.preferredLanguage === 'pt', 'Phase 1: StorageService defaults verified');
  } catch (e) {
    assert(false, `Phase 1 failed: ${e}`);
  }

  // --- FASE 2: CATÁLOGO ---
  console.log('\n--- FASE 2: CATÁLOGO DINÂMICO & OVERRIDES ---');
  try {
    const sets = await SetSyncService.quickSync('pt');
    assert(sets.length > 10, `Phase 2: Dynamic Catalog Quick Sync discovered ${sets.length} sets`);

    const me04 = sets.find((s) => s.id === 'me04');
    assert(me04 !== undefined && me04.name === 'Megaevolução — Equilíbrio Perfeito', 'Phase 2: Catalog Override applied');

    const validImg = CatalogDiagnosticService.validateCardImageRelation({
      id: 'c1',
      name: 'Charizard ex',
      setId: 'me04',
      setName: 'Equilíbrio Perfeito',
      localId: '001',
      rarity: 'Rare',
      image: 'https://assets.tcgdex.net/pt/sv/sv09/001/high.png',
      language: 'pt',
      availableVariants: { normal: true, reverse: false, holo: false, firstEdition: false },
    });
    assert(validImg === true, 'Phase 2: Catalog Diagnostic card image validation verified');
  } catch (e) {
    assert(false, `Phase 2 failed: ${e}`);
  }

  // --- FASE 3: COLEÇÃO ---
  console.log('\n--- FASE 3: COLEÇÃO AVANÇADA & ESTATÍSTICAS ---');
  try {
    await CollectionRepository.clearAll();
    const item = await CollectionService.addItem({
      cardPrintId: 'PKB:PRINT:pt:sv03.5:006',
      quantity: 3,
      acquiredPrice: 40.0,
      notes: 'Master test entry',
    });
    assert(item.id !== undefined, 'Phase 3: Item added via CollectionService');

    const allItems = await CollectionRepository.getAll();
    const stats = CollectionService.calculateStats(allItems);
    assert(stats.totalItemsQuantity === 3, `Phase 3: Stats total items quantity calculated: ${stats.totalItemsQuantity}`);
  } catch (e) {
    assert(false, `Phase 3 failed: ${e}`);
  }

  // --- FASE 4: DECKS ---
  console.log('\n--- FASE 4: DECKS & VALIDAÇÃO DE REGRAS ---');
  try {
    await DeckRepository.bulkSave([]);
    const deck = await DeckService.saveDeck({
      name: 'Charizard Turbo Master',
      format: 'Standard',
      cards: [{ cardPrintId: 'PKB:PRINT:pt:sv03.5:006', quantity: 4 }],
    });

    const validation = DeckService.validateDeck(deck, {
      'PKB:PRINT:pt:sv03.5:006': { name: 'Charizard ex' },
    });
    assert(validation.errors.length === 0, 'Phase 4: Deck format rules validated successfully');

    const availability = await DeckService.checkCollectionAvailability(deck);
    assert(availability.isFullyOwned === false, 'Phase 4: Collection availability check verified missing cards');
  } catch (e) {
    assert(false, `Phase 4 failed: ${e}`);
  }

  // --- FASE 5: PREÇOS, WISHLIST E TROCAS ---
  console.log('\n--- FASE 5: PREÇOS, TRANSAÇÕES, WISHLIST E TROCAS ---');
  try {
    await FinancialService.recordPriceSnapshot('PKB:PRINT:pt:sv03.5:006', 150.0);
    const balance = await FinancialService.calculateFinancialBalance();
    assert(balance.totalCurrentMarketValue === 450.0, `Phase 5: Financial balance market value calculated: R$ ${balance.totalCurrentMarketValue}`);

    await WishlistRepository.clear();
    await WishlistRepository.save({ cardPrintId: 'PKB:PRINT:pt:sv03.5:006', desiredQuantity: 2 });
    const wishlist = await FinancialService.getWishlistSummary();
    assert(wishlist.itemsCount === 1, 'Phase 5: Wishlist item recorded');

    await TradeRepository.clear();
    await TradeRepository.save({ cardPrintId: 'PKB:PRINT:pt:sv03.5:006', availableQuantity: 1 });
    const trade = await FinancialService.getTradeSummary();
    assert(trade.itemsCount === 1, 'Phase 5: Trade binder item recorded');
  } catch (e) {
    assert(false, `Phase 5 failed: ${e}`);
  }

  // --- FASE 6: SINCRONIZAÇÃO, BACKUP E ADMIN ---
  console.log('\n--- FASE 6: SINCRONIZAÇÃO, BACKUP, HEALTH CHECK E ADMIN ---');
  try {
    const health = await SyncEngine.performSystemHealthCheck();
    assert(health.indexedDBAvailable === true, 'Phase 6: Health check passed');

    const backupJson = await BackupService.exportBackupJSON();
    assert(backupJson.includes('schemaVersion'), 'Phase 6: Backup exported');

    const report = await BackupService.importBackupJSON(backupJson);
    assert(report.success === true, 'Phase 6: Resilient backup import verified');

    const overview = await AdminDashboardService.getAdminOverview();
    assert(overview.healthCheck.catalogHealthStatus === 'healthy', 'Phase 6: Admin Dashboard Overview verified');
  } catch (e) {
    assert(false, `Phase 6 failed: ${e}`);
  }

  console.log('\n===========================================================');
  console.log(`🎉 MASTER TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) process.exit(1);
}

runMasterTestRunner();
