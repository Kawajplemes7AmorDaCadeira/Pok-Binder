import React, { useState } from 'react';
import { User, Cloud, RefreshCw, LogOut, Download, CheckCircle2, CloudOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { BackupService } from '../../services/backup/backupService';
import { MigrationWizardModal } from './MigrationWizardModal';

export const AccountSettingsSection: React.FC = () => {
  const { user, isConfigured, isGuest, signInWithGoogle, signOut } = useAuth();
  const { status, syncNow } = useSync();
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);

  const handleSyncNow = async () => {
    setIsSyncingLocal(true);
    try {
      await syncNow();
    } finally {
      setIsSyncingLocal(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await BackupService.exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pokebinder_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup export error:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Account Profile Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-black text-base shadow-md">
              {user?.email ? user.email.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">
                {user ? user.email : 'Modo Convidado (Local)'}
              </h4>
              <p className="text-slate-400 text-xs">
                {user ? 'Conta conectada ao Supabase' : 'Dados salvos apenas neste navegador'}
              </p>
            </div>
          </div>

          {user ? (
            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-400 border border-slate-700 transition-colors text-xs flex items-center gap-1.5"
              title="Sair da Conta"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          ) : isConfigured ? (
            <button
              onClick={() => signInWithGoogle()}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <User className="w-3.5 h-3.5" /> Entrar com Google
            </button>
          ) : (
            <span className="text-[11px] text-amber-400 font-semibold">Supabase pendente .env</span>
          )}
        </div>

        {/* Sync Status Box */}
        {user && (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status da Nuvem:</span>
              <span className="font-bold flex items-center gap-1.5">
                {status.isOnline ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Conectado & Sincronizado
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <CloudOff className="w-3.5 h-3.5" /> Offline ({status.pendingCount} pendentes)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Última Sincronização:</span>
              <span className="text-slate-300 font-medium">
                {status.lastSyncedAt
                  ? new Date(status.lastSyncedAt).toLocaleString('pt-BR')
                  : 'Sessão ativa'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fila Offline Pendente:</span>
              <span className="text-amber-400 font-bold">{status.pendingCount} operações</span>
            </div>
          </div>
        )}
      </div>

      {/* Cloud & Local Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {user && (
          <button
            onClick={handleSyncNow}
            disabled={isSyncingLocal || status.isSyncing}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition-all flex items-center gap-3 disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <RefreshCw className={`w-4 h-4 ${isSyncingLocal ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <span className="text-white font-bold text-xs block">Sincronizar Agora</span>
              <span className="text-slate-400 text-[11px] block">Forçar atualização PC / Celular</span>
            </div>
          </button>
        )}

        {user && (
          <button
            onClick={() => setIsMigrationOpen(true)}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition-all flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <span className="text-white font-bold text-xs block">Assistente de Migração</span>
              <span className="text-slate-400 text-[11px] block">Enviar cartas locais para conta</span>
            </div>
          </button>
        )}

        <button
          onClick={handleExportBackup}
          className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left space-y-1 transition-all flex items-center gap-3 sm:col-span-2"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <span className="text-white font-bold text-xs block">Exportar Backup Completo (JSON)</span>
            <span className="text-slate-400 text-[11px] block">
              Gera snapshot de segurança com coleção, decks, preços e wishlist
            </span>
          </div>
        </button>
      </div>

      {/* Migration Modal */}
      <MigrationWizardModal isOpen={isMigrationOpen} onClose={() => setIsMigrationOpen(false)} />
    </div>
  );
};
