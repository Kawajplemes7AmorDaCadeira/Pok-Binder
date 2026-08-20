/**
 * SyncStatusIndicator.tsx - Header cloud synchronization status badge and account trigger.
 */

import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, User, Database } from 'lucide-react';
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

  const handleManualSync = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (status.isSchemaMissing) {
      setIsDbSetupOpen(true);
      return;
    }
    setIsSyncingNow(true);
    try {
      await syncNow();
    } finally {
      setIsSyncingNow(false);
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca sincronizado';
    try {
      const date = new Date(dateStr);
      return `Sincronizado em ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Sincronizado';
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Sync Status Button / Badge */}
        <button
          onClick={handleManualSync}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all ${
            !user
              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              : status.isSchemaMissing
              ? 'bg-amber-950/60 border-amber-800/80 text-amber-300 animate-pulse'
              : !status.isOnline
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-400'
              : status.isSyncing || isSyncingNow
              ? 'bg-blue-950/40 border-blue-800/60 text-blue-300 animate-pulse'
              : status.pendingCount > 0
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : status.state === 'ERROR'
              ? 'bg-red-950/40 border-red-800/60 text-red-400'
              : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
          }`}
          title={
            !user
              ? 'Clique para conectar sua conta e sincronizar com o celular'
              : status.isSchemaMissing
              ? 'Tabelas não encontradas no Supabase. Clique para copiar o script SQL.'
              : !status.isOnline
              ? 'Você está offline. As alterações serão sincronizadas quando reconectar.'
              : status.pendingCount > 0
              ? `${status.pendingCount} alteração(ões) pendentes. Clique para sincronizar agora.`
              : formatLastSync(status.lastSyncedAt)
          }
        >
          {!user ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Conectar Nuvem</span>
            </>
          ) : status.isSchemaMissing ? (
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
              <span className="hidden sm:inline">Sincronizado</span>
            </>
          )}
        </button>

        {/* User Account Button */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${
            user
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/40'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
          title={user ? `Conta: ${user.email}` : 'Entrar na conta'}
        >
          {user ? (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
              {(user.user_metadata?.display_name || user.email || 'U').charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="w-4 h-4" />
          )}
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
