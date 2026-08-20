import { SyncEngine } from '../services/sync/syncEngine';
import { BackupService } from '../services/backup/backupService';
import { AdminDashboardService } from '../services/admin/adminDashboardService';
import { CollectionRepository } from '../database/repositories/CollectionRepository';
import { DeckRepository } from '../database/repositories/DeckRepository';

async function runPhase6Tests() {
  console.log('=== RUNNING FASE 6 (SINCRONIZAÇÃO, BACKUP & ADMIN) AUTOMATED TESTS ===\n');
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

  // Test 1: SyncEngine Concurrency Locking
  try {
    const lock1 = SyncEngine.acquireLock();
    assert(lock1 === true, 'First sync lock acquired successfully');

    const lock2 = SyncEngine.acquireLock();
    assert(lock2 === false, 'Concurrent sync lock request rejected correctly');

    SyncEngine.releaseLock();
    const lock3 = SyncEngine.acquireLock();
    assert(lock3 === true, 'Lock re-acquired after release');
    SyncEngine.releaseLock();
  } catch (err) {
    assert(false, `SyncEngine lock test failed: ${err}`);
  }

  // Test 2: System Health Check
  try {
    const health = await SyncEngine.performSystemHealthCheck();
    assert(health.indexedDBAvailable === true, 'IndexedDB health check: AVAILABLE');
    assert(health.catalogHealthStatus === 'healthy', 'Catalog health status: HEALTHY');
    assert(typeof health.tableCounts['collectionItems'] === 'number', 'Table counts populated');
  } catch (err) {
    assert(false, `System health check failed: ${err}`);
  }

  // Test 3: Resilient Backup Export & Import with Sanitization
  try {
    // Clear and prepare data
    await CollectionRepository.clearAll();
    await CollectionRepository.save({
      id: 'c1',
      cardPrintId: 'PKB:PRINT:pt:sv03.5:006',
      quantity: 2,
      condition: 'near_mint',
      variant: 'normal',
      language: 'pt',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Export backup
    const exportedJson = await BackupService.exportBackupJSON();
    assert(typeof exportedJson === 'string' && exportedJson.includes('schemaVersion'), 'Exported backup JSON valid');

    // Clear repository before import
    await CollectionRepository.clearAll();

    // Import backup
    const report = await BackupService.importBackupJSON(exportedJson);
    assert(report.success === true, 'Backup import executed successfully');
    assert(report.importedCollectionCount === 1, `Imported 1 collection item: ${report.importedCollectionCount}`);

    const restored = await CollectionRepository.getAll();
    assert(restored.length === 1 && restored[0].quantity === 2, 'Restored collection data verified');
  } catch (err) {
    assert(false, `Backup export/import test failed: ${err}`);
  }

  // Test 4: Admin Dashboard Overview
  try {
    const overview = await AdminDashboardService.getAdminOverview();
    assert(overview.healthCheck.indexedDBAvailable === true, 'Admin overview contains valid health check');
    assert(typeof overview.entityCounts.userCollectionItems === 'number', 'Admin overview entity counts verified');
    assert(overview.storageStatus.syncEngineStatus !== undefined, 'Admin overview sync engine status verified');
  } catch (err) {
    assert(false, `Admin overview test failed: ${err}`);
  }

  console.log(`\n=== FASE 6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runPhase6Tests();
