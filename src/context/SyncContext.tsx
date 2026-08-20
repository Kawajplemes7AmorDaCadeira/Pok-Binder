/**
 * SyncContext.tsx
 * Light-weight reactive provider exposing live cloud synchronization status.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SyncStatusInfo, SyncStatusService } from '../services/cloud/sync/SyncStatusService';
import { SyncService } from '../services/cloud/sync/SyncService';
import { LocalMigrationService, MigrationResult } from '../services/cloud/sync/LocalMigrationService';
import { useAuth } from './AuthContext';

interface SyncContextType {
  status: SyncStatusInfo;
  syncNow: () => Promise<void>;
  migrateLocalData: () => Promise<MigrationResult | null>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatusInfo>(() => SyncStatusService.getStatus());

  useEffect(() => {
    const unsubscribe = SyncStatusService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const syncNow = async () => {
    await SyncService.syncNow();
  };

  const migrateLocalData = async (): Promise<MigrationResult | null> => {
    if (!user) return null;
    const result = await LocalMigrationService.migrateToCloud(user.id);
    if (result.success) {
      await SyncService.syncNow();
    }
    return result;
  };

  return (
    <SyncContext.Provider value={{ status, syncNow, migrateLocalData }}>
      {children}
    </SyncContext.Provider>
  );
};
