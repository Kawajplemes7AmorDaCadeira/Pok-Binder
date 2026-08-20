/**
 * SyncQueue.ts - Manages offline operation queue with quota-safe storage fallback.
 */

export type SyncEntity = 'COLLECTION' | 'DECK' | 'WISHLIST' | 'FAVORITE' | 'PURCHASE' | 'PRICE_LINK' | 'SETTINGS';
export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncStatusState = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SyncOperation {
  id: string;
  userId: string;
  entity: SyncEntity;
  operation: SyncOperationType;
  entityId: string;
  payload: unknown;
  createdAt: string;
  status: SyncStatusState;
  retryCount: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = 'pokebinder_sync_queue_v1';
const memoryQueues = new Map<string, SyncOperation[]>();

export class SyncQueue {
  public static getQueue(userId: string): SyncOperation[] {
    if (memoryQueues.has(userId)) {
      return memoryQueues.get(userId)!;
    }
    try {
      const stored = localStorage.getItem(`${QUEUE_STORAGE_KEY}_${userId}`);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      memoryQueues.set(userId, parsed);
      return parsed;
    } catch {
      return [];
    }
  }

  public static saveQueue(userId: string, queue: SyncOperation[]): void {
    memoryQueues.set(userId, queue);
    try {
      localStorage.setItem(`${QUEUE_STORAGE_KEY}_${userId}`, JSON.stringify(queue));
    } catch {
      try {
        localStorage.clear();
        localStorage.setItem(`${QUEUE_STORAGE_KEY}_${userId}`, JSON.stringify(queue));
      } catch (e) {
        console.warn('LocalStorage quota exceeded for sync queue, keeping in memory.', e);
      }
    }
  }

  public static enqueue(userId: string, entity: SyncEntity, operation: SyncOperationType, entityId: string, payload: unknown): void {
    const queue = this.getQueue(userId);
    const existingIndex = queue.findIndex(op => op.entity === entity && op.entityId === entityId && op.status === 'PENDING');

    const op: SyncOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      entity,
      operation,
      entityId,
      payload,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
    };

    if (existingIndex >= 0 && operation !== 'DELETE') {
      queue[existingIndex] = {
        ...queue[existingIndex],
        operation: queue[existingIndex].operation === 'CREATE' ? 'CREATE' : operation,
        payload,
        createdAt: new Date().toISOString(),
      };
    } else {
      queue.push(op);
    }

    this.saveQueue(userId, queue);
  }

  public static clearCompleted(userId: string): void {
    const queue = this.getQueue(userId);
    const active = queue.filter(op => op.status !== 'SYNCED');
    this.saveQueue(userId, active);
  }

  public static getPendingCount(userId: string): number {
    return this.getQueue(userId).filter(op => op.status === 'PENDING' || op.status === 'FAILED').length;
  }
}
