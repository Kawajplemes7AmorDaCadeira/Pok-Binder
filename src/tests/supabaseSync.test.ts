/**
 * Automated Test Suite for Supabase Cloud Migration, SyncQueue & Multi-Device Synchronization
 */

import { SyncQueue } from '../services/cloud/sync/SyncQueue';
import { SyncConflictResolver } from '../services/cloud/sync/SyncConflictResolver';
import { LocalMigrationService } from '../services/cloud/sync/LocalMigrationService';
import { isSupabaseConfigured, getSupabaseClient } from '../services/cloud/supabaseClient';
import { CollectionItemEntity, DeckEntity, WishlistItemEntity } from '../types/db';

// Mock localStorage for Node.js test environment if not present
if (typeof localStorage === 'undefined' || !localStorage.getItem) {
  const store = new Map<string, string>();
  (global as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

export async function runSupabaseSyncTests(): Promise<{ total: number; passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${testName}`);
    } else {
      failed++;
      errors.push(testName);
      console.error(`  ✗ ${testName}`);
    }
  }

  console.log('\n--- Running Supabase Sync & Cloud Migration Test Suite ---');

  // Test 1: Graceful Unconfigured State
  try {
    const client = getSupabaseClient();
    assert(client === null || typeof client === 'object', 'Supabase client initializes or safely returns null without runtime exceptions');
  } catch (err: any) {
    assert(false, `Supabase client error: ${err.message}`);
  }

  // Test 2: SyncQueue Enqueue and FIFO Ordering
  try {
    SyncQueue.clear();
    const op1 = SyncQueue.enqueue({
      entityType: 'collection',
      action: 'INCREMENT',
      data: {
        cardId: 'sv07-010',
        variant: 'holo',
        condition: 'near_mint',
        language: 'pt',
        delta: 2,
      },
    });

    const op2 = SyncQueue.enqueue({
      entityType: 'favorite',
      action: 'UPSERT',
      data: {
        cardId: 'sv07-010',
        isFavorite: true,
      },
    });

    const queue = SyncQueue.getQueue();
    assert(queue.length === 2, 'SyncQueue enqueues operations correctly');
    assert(queue[0].id === op1.id, 'SyncQueue preserves FIFO order (first item matches)');
    assert(queue[1].id === op2.id, 'SyncQueue preserves FIFO order (second item matches)');
    assert(typeof queue[0].originDeviceId === 'string', 'SyncQueue attaches originDeviceId for multi-device deduplication');
  } catch (err: any) {
    assert(false, `SyncQueue enqueue error: ${err.message}`);
  }

  // Test 3: SyncQueue Removal and Retry Tracking
  try {
    const queue = SyncQueue.getQueue();
    const firstOpId = queue[0].id;
    SyncQueue.markFailed(firstOpId);

    const updatedQueue = SyncQueue.getQueue();
    assert(updatedQueue[0].retryCount === 1, 'SyncQueue markFailed increments retry count');

    SyncQueue.remove(firstOpId);
    assert(SyncQueue.getQueue().length === 1, 'SyncQueue remove cleans up completed operation');
  } catch (err: any) {
    assert(false, `SyncQueue retry/remove error: ${err.message}`);
  }

  // Test 4: Conflict Resolution - Quantity Policy (Never Blind LWW)
  try {
    const localItem: CollectionItemEntity = {
      id: 'col_local_1',
      cardPrintId: 'sv07-001',
      variant: 'normal',
      condition: 'near_mint',
      language: 'pt',
      quantity: 3,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T01:00:00.000Z',
    };

    const cloudItem: CollectionItemEntity = {
      id: 'col_cloud_1',
      cardPrintId: 'sv07-001',
      variant: 'normal',
      condition: 'near_mint',
      language: 'pt',
      quantity: 5,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T02:00:00.000Z',
    };

    const resolved = SyncConflictResolver.resolveCollectionItem(localItem, cloudItem);
    assert(resolved !== null && resolved.quantity === 5, 'Conflict resolver adopts highest quantity between devices (3 vs 5 => 5)');
  } catch (err: any) {
    assert(false, `Conflict resolver quantity error: ${err.message}`);
  }

  // Test 5: Conflict Resolution - Soft Deletes
  try {
    const activeLocal: CollectionItemEntity = {
      id: 'col_local_2',
      cardPrintId: 'sv07-002',
      variant: 'normal',
      condition: 'near_mint',
      language: 'pt',
      quantity: 1,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T01:00:00.000Z',
    };

    const deletedCloud: CollectionItemEntity = {
      id: 'col_cloud_2',
      cardPrintId: 'sv07-002',
      variant: 'normal',
      condition: 'near_mint',
      language: 'pt',
      quantity: 0,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T03:00:00.000Z',
      deletedAt: '2026-08-20T03:00:00.000Z',
    };

    const resolved = SyncConflictResolver.resolveCollectionItem(activeLocal, deletedCloud);
    assert(resolved !== null && Boolean(resolved.deletedAt), 'Conflict resolver honors more recent soft-delete from remote device');
  } catch (err: any) {
    assert(false, `Conflict resolver soft-delete error: ${err.message}`);
  }

  // Test 6: Deck Conflict Resolution - Last-Write-Wins on Deck Metadata
  try {
    const localDeck: DeckEntity = {
      id: 'deck_1',
      name: 'Charizard Standard V1',
      format: 'Standard',
      cards: [],
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T01:00:00.000Z',
    };

    const cloudDeck: DeckEntity = {
      id: 'deck_1',
      name: 'Charizard Standard Turbo V2',
      format: 'Standard',
      cards: [],
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T02:00:00.000Z',
    };

    const resolvedDeck = SyncConflictResolver.resolveDeck(localDeck, cloudDeck);
    assert(resolvedDeck?.name === 'Charizard Standard Turbo V2', 'Deck conflict resolver accurately updates to most recent version');
  } catch (err: any) {
    assert(false, `Deck conflict resolver error: ${err.message}`);
  }

  // Test 7: Local Data Audit Summary Inspection
  try {
    const summary = await LocalMigrationService.inspectLocalData('test-user-123');
    assert(typeof summary.collectionCount === 'number', 'Migration audit inspects collection count');
    assert(typeof summary.deckCount === 'number', 'Migration audit inspects deck count');
    assert(typeof summary.favoriteCount === 'number', 'Migration audit inspects favorite count');
    assert(typeof summary.hasMigrated === 'boolean', 'Migration audit checks previous migration status');
  } catch (err: any) {
    assert(false, `Migration audit inspect error: ${err.message}`);
  }

  console.log(`\nSupabase Sync Test Summary: ${passed} passed, ${failed} failed`);
  return { total: passed + failed, passed, failed, errors };
}

// Run standalone if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('supabaseSync.test')) {
  runSupabaseSyncTests().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}
