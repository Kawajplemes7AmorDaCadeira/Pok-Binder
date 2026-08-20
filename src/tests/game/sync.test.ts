/**
 * sync.test.ts - Tests for Multi-Device Cloud Synchronization Architecture
 */

import { AuthService } from '../../services/sync/AuthService';
import { SyncQueue } from '../../services/sync/SyncQueue';
import { CloudRepository } from '../../services/sync/CloudRepository';

export async function runSyncTests() {
  const results: { name: string; passed: boolean; message?: string }[] = [];

  // Mock localStorage if needed
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

  // Test 1: AuthService login & retrieval
  try {
    const user = {
      userId: 'test_user_123',
      email: 'test@pokebinder.com',
      name: 'Test Trainer',
      provider: 'google' as const,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('pokebinder_auth_user_v1', JSON.stringify(user));
    const retrieved = AuthService.getCurrentUser();
    results.push({
      name: 'AuthService retrieves authenticated user correctly',
      passed: retrieved?.userId === 'test_user_123' && retrieved?.email === 'test@pokebinder.com',
      message: `Retrieved user: ${JSON.stringify(retrieved)}`,
    });
  } catch (e: any) {
    results.push({ name: 'AuthService retrieves authenticated user correctly', passed: false, message: e.message });
  }

  // Test 2: SyncQueue pending operations
  try {
    const userId = 'test_user_123';
    localStorage.removeItem(`pokebinder_sync_queue_v1_${userId}`);
    SyncQueue.enqueue(userId, 'COLLECTION', 'CREATE', 'card_001', { quantity: 1 });
    const count = SyncQueue.getPendingCount(userId);
    results.push({
      name: 'SyncQueue enqueues and counts pending operations',
      passed: count === 1,
      message: `Pending count: ${count}`,
    });
  } catch (e: any) {
    results.push({ name: 'SyncQueue enqueues and counts pending operations', passed: false, message: e.message });
  }

  // Test 3: CloudRepository storage & retrieval
  try {
    const userId = 'test_user_123';
    await CloudRepository.saveUserCloudData(userId, {
      collectionItems: [{ id: 'item_1', cardId: 'sv03.5-001', quantity: 2 }],
    });
    const cloudData = await CloudRepository.getUserCloudData(userId);
    results.push({
      name: 'CloudRepository saves and retrieves user cloud data',
      passed: cloudData.collectionItems.length === 1 && cloudData.collectionItems[0].quantity === 2,
      message: `Cloud data items: ${cloudData.collectionItems.length}`,
    });
  } catch (e: any) {
    results.push({ name: 'CloudRepository saves and retrieves user cloud data', passed: false, message: e.message });
  }

  return results;
}
