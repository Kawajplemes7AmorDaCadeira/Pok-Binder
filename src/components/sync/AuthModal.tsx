/**
 * AuthModal.tsx - Zero-Login Multi-Device Sync Modal
 * Synchronizes devices seamlessly using a shared Sync Code without passwords or email verification.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, CheckCircle2, AlertCircle, X, Copy, RefreshCw, Smartphone, Monitor, ShieldCheck, Sparkles, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { DatabaseSetupModal } from './DatabaseSetupModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, syncCode, setSyncCodeAndConnect } = useAuth();
  const { status, syncNow, migrateLocalData } = useSync();

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDbSetupOpen, setIsDbSetupOpen] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      setError('Por favor, digite o código de sincronização.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsSyncing(true);

    try {
      const res = await setSyncCodeAndConnect(inputCode);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMsg(`Conectado ao código ${inputCode.trim().toUpperCase()}! Sincronizando coleção...`);
        setInputCode('');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao conectar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    setError('');
    setSuccessMsg('');
    try {
      await migrateLocalData();
      await syncNow();
      setSuccessMsg('Todas as cartas foram sincronizadas com a nuvem!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setError('Erro na sincronização: ' + e?.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0a1224] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden">
        {/* Top Header Background Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Status Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Sincronização do Seu Binder
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Sem Senhas
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Conecte até 2 ou mais aparelhos à mesma coleção automaticamente.
            </p>
          </div>
        </div>

        {/* Active Cloud Connection Status */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                Nuvem Conectada e Ativa
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </p>
              <p className="text-[11px] text-slate-400">
                Sua coleção é salva no Supabase em tempo real.
              </p>
            </div>
          </div>

          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Sincronizar dados com a nuvem agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>

        {/* Sync Code Box */}
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0d172e] border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Seu Código de Sincronização:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#060a14] border border-slate-700/80 rounded-xl px-4 py-3 font-mono text-base font-bold text-amber-300 tracking-wider text-center select-all">
              {syncCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/30 flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            💡 <strong>Como usar no 2º aparelho:</strong> Abra o aplicativo no seu outro celular/computador, clique nesta janela e digite o código <span className="text-amber-300 font-mono font-bold">{syncCode}</span> abaixo. Pronto! Ambos ficarão com as mesmas cartas.
          </p>
        </div>

        {/* Connect Another Device Form */}
        <form onSubmit={handleConnectCode} className="mb-6">
          <label className="block text-xs font-bold text-slate-300 mb-2">
            🔗 Conectar Outro Aparelho com Código:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: MEU-BINDER-PRO"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="flex-1 bg-[#060a14] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/80 font-mono font-bold"
            />
            <button
              type="submit"
              disabled={isSyncing || !inputCode.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
            >
              Conectar
            </button>
          </div>
        </form>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SQL Schema Button if missing */}
        {status.isSchemaMissing && (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Tabelas do Supabase pendentes</span>
            </div>
            <button
              onClick={() => setIsDbSetupOpen(true)}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px]"
            >
              Ver Script SQL
            </button>
          </div>
        )}

        {/* Multi Device Illustration Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <span>Celular</span>
            <span className="text-slate-600">↔</span>
            <Monitor className="w-4 h-4 text-slate-400" />
            <span>Computador</span>
          </div>

          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sem e-mails ou senhas
          </span>
        </div>
      </div>

      <DatabaseSetupModal
        isOpen={isDbSetupOpen}
        onClose={() => setIsDbSetupOpen(false)}
      />
    </div>,
    document.body
  );
};
