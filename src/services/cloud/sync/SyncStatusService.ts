/**
 * Reactive Sync Status & Connection State Service
 */

export type SyncState = 'SYNCED' | 'SYNCING' | 'OFFLINE' | 'ERROR' | 'UNCONFIGURED' | 'SCHEMA_MISSING';

export interface SyncStatusInfo {
  state: SyncState;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  userId: string | null;
  userEmail: string | null;
  isSchemaMissing?: boolean;
}

type StatusListener = (status: SyncStatusInfo) => void;

const LAST_SYNCED_KEY = 'pokebinder_last_synced_at_v1';

export class SyncStatusService {
  private static listeners = new Set<StatusListener>();

  private static currentStatus: SyncStatusInfo = {
    state: 'UNCONFIGURED',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_SYNCED_KEY) : null,
    errorMessage: null,
    userId: null,
    userEmail: null,
    isSchemaMissing: false,
  };

  public static init(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.update({ isOnline: true });
      });
      window.addEventListener('offline', () => {
        this.update({ isOnline: false, state: 'OFFLINE' });
      });
    }
  }

  public static getStatus(): SyncStatusInfo {
    return { ...this.currentStatus };
  }

  public static update(partial: Partial<SyncStatusInfo>): void {
    let nextState = partial.state || this.currentStatus.state;

    if (partial.isOnline === false || (!this.currentStatus.isOnline && partial.isOnline === undefined)) {
      nextState = 'OFFLINE';
    } else if (partial.isSyncing) {
      nextState = 'SYNCING';
    } else if (partial.errorMessage) {
      nextState = 'ERROR';
    } else if (partial.lastSyncedAt || this.currentStatus.lastSyncedAt) {
      nextState = 'SYNCED';
    }

    if (partial.lastSyncedAt) {
      try {
        localStorage.setItem(LAST_SYNCED_KEY, partial.lastSyncedAt);
      } catch {}
    }

    this.currentStatus = {
      ...this.currentStatus,
      ...partial,
      state: nextState,
    };

    this.notify();
  }

  public static subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    const status = this.getStatus();
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch (err) {
        console.warn('Sync status listener error:', err);
      }
    });
  }
}
