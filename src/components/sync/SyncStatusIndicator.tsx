/**
 * SyncStatusIndicator.tsx - Header cloud synchronization status badge and account trigger.
 */

import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { SyncService, SyncStatusInfo } from '../../services/sync/SyncService';
import { AuthService, UserProfile } from '../../services/sync/AuthService';
import { AuthModal } from './AuthModal';

export const SyncStatusIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(SyncService.getStatus());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(AuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  useEffect(() => {
    const unsubscribe = SyncService.subscribe((status) => {
      setSyncStatus(status);
    });

    const interval = setInterval(() => {
      setSyncStatus(SyncService.getStatus());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsSyncingNow(true);
    await SyncService.syncNow();
    setIsSyncingNow(false);
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca sincronizado';
    const date = new Date(dateStr);
    return `Sincronizado em ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Sync Status Button / Badge */}
        <button
          onClick={handleManualSync}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
            !currentUser
              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              : syncStatus.status === 'OFFLINE'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-400'
              : syncStatus.status === 'PENDING'
              ? 'bg-blue-950/40 border-blue-800/60 text-blue-300 animate-pulse'
              : syncStatus.status === 'ERROR'
              ? 'bg-red-950/40 border-red-800/60 text-red-400'
              : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
          }`}
          title={
            !currentUser
              ? 'Clique para entrar na conta e ativar a sincronização em nuvem'
              : syncStatus.status === 'OFFLINE'
              ? 'Você está offline. As alterações serão sincronizadas quando reconectar.'
              : syncStatus.status === 'PENDING'
              ? `${syncStatus.pendingCount} alteração(ões) pendentes. Clique para sincronizar.`
              : formatLastSync(syncStatus.lastSyncedAt)
          }
        >
          {!currentUser ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Conectar Nuvem</span>
            </>
          ) : syncStatus.status === 'OFFLINE' ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Offline</span>
            </>
          ) : syncStatus.status === 'PENDING' ? (
            <>
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncStatus.pendingCount} pendente(s)</span>
            </>
          ) : (
            <>
              <Cloud className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizado</span>
            </>
          )}
        </button>

        {/* User Account Button */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${
            currentUser
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/40'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
          title={currentUser ? `Conta: ${currentUser.email}` : 'Entrar na conta'}
        >
          {currentUser && currentUser.name ? (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="w-4 h-4" />
          )}
        </button>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthChange={(u) => {
          setCurrentUser(u);
          setSyncStatus(SyncService.getStatus());
        }}
      />
    </>
  );
};
