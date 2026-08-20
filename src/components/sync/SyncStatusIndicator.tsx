/**
 * SyncStatusIndicator.tsx - Header cloud synchronization status badge and account trigger.
 */

import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, User, Database, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { AuthModal } from './AuthModal';
import { DatabaseSetupModal } from './DatabaseSetupModal';

export const SyncStatusIndicator: React.FC = () => {
  const { user, isConfigured } = useAuth();
  const { status, syncNow } = useSync();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDbSetupOpen, setIsDbSetupOpen] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const handleOpenSyncModal = () => {
    if (status.isSchemaMissing) {
      setIsDbSetupOpen(true);
      return;
    }
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Sync Status Button / Badge */}
        <button
          onClick={handleOpenSyncModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm ${
            status.isSchemaMissing
              ? 'bg-amber-950/60 border-amber-800/80 text-amber-300 animate-pulse'
              : !status.isOnline
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-400'
              : status.isSyncing || isSyncingNow
              ? 'bg-blue-950/40 border-blue-800/60 text-blue-300 animate-pulse'
              : status.pendingCount > 0
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
          }`}
          title="Clique para ver o código de sincronização entre aparelhos"
        >
          {status.isSchemaMissing ? (
            <>
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Criar Tabelas SQL</span>
            </>
          ) : !status.isOnline ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Offline</span>
            </>
          ) : status.isSyncing || isSyncingNow ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="hidden sm:inline">Sincronizando...</span>
            </>
          ) : status.pendingCount > 0 ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{status.pendingCount} pendente(s)</span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Nuvem Ativa</span>
            </>
          )}
        </button>

        {/* Multi Device Sync Icon Trigger Button */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="p-1.5 rounded-xl border bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all flex items-center justify-center"
          title="Sincronização do Binder entre Aparelhos (Código sem senha)"
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <DatabaseSetupModal
        isOpen={isDbSetupOpen}
        onClose={() => setIsDbSetupOpen(false)}
      />
    </>
  );
};
