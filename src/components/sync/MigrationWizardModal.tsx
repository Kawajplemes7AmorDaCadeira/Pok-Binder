import React, { useState, useEffect } from 'react';
import { Cloud, Download, CheckCircle2, AlertTriangle, RefreshCw, X, ShieldCheck, Database } from 'lucide-react';
import { LocalMigrationService, LocalDataSummary, MigrationResult } from '../../services/cloud/sync/LocalMigrationService';
import { BackupService } from '../../services/backup/backupService';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';

interface MigrationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MigrationWizardModal: React.FC<MigrationWizardModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { syncNow } = useSync();
  const [summary, setSummary] = useState<LocalDataSummary | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      LocalMigrationService.inspectLocalData(user.id).then(setSummary);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleDownloadBackup = async () => {
    try {
      const json = await BackupService.exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pokebinder_backup_pre_migration_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
    } catch (err) {
      console.error('Backup download error:', err);
    }
  };

  const handleExecuteMigration = async () => {
    setIsMigrating(true);
    try {
      const res = await LocalMigrationService.migrateToCloud(user.id);
      setMigrationResult(res);
      if (res.success) {
        await syncNow();
        const updated = await LocalMigrationService.inspectLocalData(user.id);
        setSummary(updated);
      }
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm">Migração Segura para Nuvem</h3>
              <p className="text-slate-400 text-xs">Sincronize seus dados com {user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Screen */}
        {migrationResult ? (
          <div className="space-y-4 text-center">
            {migrationResult.success ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-white font-bold text-sm">Migração Concluída com Sucesso!</h4>
                <p className="text-emerald-300 text-xs">
                  {migrationResult.uploadedCollection} cartas, {migrationResult.uploadedDecks} decks e favoritos sincronizados com o Supabase.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-2xl space-y-2">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                <h4 className="text-white font-bold text-sm">Aviso na Migração</h4>
                <p className="text-red-300 text-xs">
                  Seus dados locais continuam 100% seguros e intactos no navegador.
                </p>
                {migrationResult.errors.map((e, idx) => (
                  <p key={idx} className="text-[11px] text-red-400 text-left font-mono">
                    • {e}
                  </p>
                ))}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          /* Inspection Preview & Confirmation */
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Dados Encontrados Neste Dispositivo
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Coleção</span>
                  <span className="text-white font-bold text-sm">
                    {summary?.collectionCount || 0} cartas ({summary?.totalCardsQuantity || 0} un.)
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Decks</span>
                  <span className="text-white font-bold text-sm">{summary?.deckCount || 0} decks</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Favoritos</span>
                  <span className="text-white font-bold text-sm">{summary?.favoriteCount || 0} cartas</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[10px]">Wishlist</span>
                  <span className="text-white font-bold text-sm">{summary?.wishlistCount || 0} itens</span>
                </div>
              </div>
            </div>

            {/* Non-destructive guarantee notice */}
            <div className="flex items-start gap-2 p-3 bg-amber-950/30 border border-amber-800/50 rounded-2xl text-[11px] text-amber-300">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Regra de Segurança:</strong> Nenhum dado local será apagado ou sobrescrito durante o envio.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleDownloadBackup}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4 text-amber-400" />
                {backupDownloaded ? 'Backup Salvo com Sucesso ✓' : 'Fazer Backup Preventivo (JSON)'}
              </button>

              <button
                onClick={handleExecuteMigration}
                disabled={isMigrating}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-xs shadow-xl shadow-red-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Migrando com Segurança...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" /> Sincronizar com Minha Conta
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
