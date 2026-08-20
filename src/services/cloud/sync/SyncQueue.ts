/**
 * Local Sync Queue for Offline Operations & Idempotent Cloud Sync
 */

import { SyncOperation } from './SyncOperation';
export type { SyncOperation } from './SyncOperation';

const QUEUE_STORAGE_KEY = 'pokebinder_sync_queue_v1';
const DEVICE_ID_KEY = 'pokebinder_device_id_v1';

export class SyncQueue {
  private static deviceId: string | null = null;

  /**
   * Returns a persistent, anonymous device ID for origin tracking and loop deduplication
   */
  public static getDeviceId(): string {
    if (this.deviceId) return this.deviceId;

    try {
      let stored = localStorage.getItem(DEVICE_ID_KEY);
      if (!stored) {
        stored = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(DEVICE_ID_KEY, stored);
      }
      this.deviceId = stored;
      return stored;
    } catch {
      return 'dev_unknown';
    }
  }

  /**
   * Enqueue a new strongly typed sync operation
   */
  public static enqueue(op: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'originDeviceId'>): SyncOperation {
    const fullOp: SyncOperation = {
      ...(op as any),
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      originDeviceId: this.getDeviceId(),
    };

    const queue = this.getQueue();
    queue.push(fullOp);
    this.saveQueue(queue);
    return fullOp;
  }

  /**
   * Retrieve all pending sync operations in FIFO order
   */
  public static getQueue(): SyncOperation[] {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Remove operation upon successful sync confirmation
   */
  public static remove(operationId: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter((op) => op.id !== operationId);
    this.saveQueue(filtered);
  }

  /**
   * Increment retry count and mark with last error
   */
  public static markFailed(operationId: string, error?: string): void {
    const queue = this.getQueue();
    const updated = queue.map((op) => {
      if (op.id === operationId) {
        return {
          ...op,
          retryCount: (op.retryCount || 0) + 1,
          lastError: error,
        };
      }
      return op;
    });
    this.saveQueue(updated);
  }

  /**
   * Number of pending mutations awaiting cloud sync
   */
  public static getPendingCount(): number {
    return this.getQueue().length;
  }

  /**
   * Clear entire queue (used during complete local reset or test teardown)
   */
  public static clear(): void {
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private static saveQueue(queue: SyncOperation[]): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('SyncQueue.saveQueue failed:', e);
    }
  }
}
