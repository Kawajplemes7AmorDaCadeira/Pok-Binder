import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2, User, Database } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';

export const SyncStatusBadge: React.FC = () => {
  const { status, syncNow } = useSync();
  const { user, isConfigured, signInWithGoogle } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const handleSyncClick = async () => {
    setIsTriggering(true);
    try {
      await syncNow();
    } finally {
      setIsTriggering(false);
    }
  };

  // 1. Unconfigured or Guest mode badge
  if (!isConfigured || !user) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600 transition-all text-xs font-semibold"
          title="Modo Local (Offline)"
        >
          <CloudOff className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline text-[11px]">Modo Local</span>
        </button>

        {isModalOpen && (
          <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-slideUp text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-black text-sm">Armazenamento Local</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Seus dados estão salvos neste dispositivo. Faça login com o Google para sincronizar entre PC e celular.
                </p>
              </div>

              {isConfigured ? (
                <button
                  onClick={async () => {
                    await signInWithGoogle();
                    setIsModalOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" /> Entrar com o Google
                </button>
              ) : (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400 text-left">
                  <p className="font-bold text-amber-400 mb-1">Configuração do Supabase pendente:</p>
                  <p>Adicione as chaves <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code>.</p>
                </div>
              )}

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. Active Cloud Sync Badges
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold hover:border-slate-500 transition-all"
        title="Status de Sincronização em Nuvem"
      >
        {status.isSyncing || isTriggering ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span className="text-[11px] text-blue-300 hidden sm:inline">Sincronizando...</span>
          </>
        ) : !status.isOnline ? (
          <>
            <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-amber-300 hidden sm:inline">
              Offline {status.pendingCount > 0 && `(${status.pendingCount})`}
            </span>
          </>
        ) : status.errorMessage ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] text-red-300 hidden sm:inline">Aviso Sync</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-emerald-300 hidden sm:inline">
              {status.pendingCount > 0 ? `${status.pendingCount} pendentes` : 'Nuvem OK'}
            </span>
          </>
        )}
      </button>

      {/* Sync Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-slideUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-black text-xs">Sincronização Nuvem</h3>
                  <p className="text-slate-400 text-[10px]">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className="text-white font-bold flex items-center gap-1">
                  {status.isOnline ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Conectado
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Modo Offline
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Operações Pendentes</span>
                <span className="text-amber-400 font-bold">{status.pendingCount} na fila</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Última Sincronização</span>
                <span className="text-slate-300 font-semibold text-[11px]">
                  {status.lastSyncedAt
                    ? new Date(status.lastSyncedAt).toLocaleTimeString('pt-BR')
                    : 'Ainda não realizada'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSyncClick}
                disabled={isTriggering || status.isSyncing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
                Sincronizar Agora
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
