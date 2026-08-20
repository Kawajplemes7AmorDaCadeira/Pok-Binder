/**
 * DatabaseSetupModal.tsx
 * 1-Click Supabase PostgreSQL Schema Generator & Migration Assistant
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Database, Copy, Check, ExternalLink, X, Terminal, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { POKEBINDER_COMPLETE_SUPABASE_SQL } from '../../services/cloud/supabaseSchemaSql';
import { useSync } from '../../context/SyncContext';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const { syncNow, migrateLocalData } = useSync();
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(POKEBINDER_COMPLETE_SUPABASE_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = POKEBINDER_COMPLETE_SUPABASE_SQL;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyMessage(null);
    try {
      await migrateLocalData();
      await syncNow();
      setVerifyMessage('✅ Tabelas detectadas com sucesso! Sua coleção foi sincronizada.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (e: any) {
      setVerifyMessage('As tabelas ainda não foram criadas no Supabase. Cole o script no SQL Editor e clique em "Run".');
    } finally {
      setIsVerifying(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#090d18] border border-slate-800 rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/80 text-red-400 text-xs font-bold">
            <Database className="w-3.5 h-3.5" />
            Configuração Inicial do Banco de Dados
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            Criar Tabelas no Supabase
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Seu projeto no Supabase foi conectado, mas as tabelas (<code className="text-red-400 bg-slate-950 px-1 py-0.5 rounded">collection_items</code>, etc.) ainda não foram criadas. Execute o script abaixo com 1 clique para ativar o salvamento instantâneo!
          </p>
        </div>

        {/* 3 Step Instruction */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-red-600/30 border border-red-500/40 text-red-300 font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-200">Copie o Script</h4>
            <p className="text-[11px] text-slate-400">Clique no botão verde abaixo para copiar o código SQL completo.</p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-200">Abra o SQL Editor</h4>
            <p className="text-[11px] text-slate-400">Abra o editor do Supabase e cole o script copiado.</p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-200">Clique em Run</h4>
            <p className="text-[11px] text-slate-400">Clique em "Run" no Supabase e pronto, tudo estará ativo!</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopy}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Script Copiado para Área de Transferência!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> 📋 Copiar Script SQL do Banco
              </>
            )}
          </button>

          <a
            href="https://supabase.com/dashboard/project/hefrdbyqchvvvqyacbkm/sql/new"
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-sky-400" /> Abrir Supabase SQL Editor
          </a>
        </div>

        {/* Code Preview */}
        <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs px-1">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> schema_pokebinder.sql (Tabelas + RLS + Triggers)
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <pre className="text-[10px] font-mono text-slate-300 max-h-36 overflow-y-auto bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 select-all whitespace-pre-wrap">
            {POKEBINDER_COMPLETE_SUPABASE_SQL.slice(0, 800)}...
          </pre>
        </div>

        {/* Verification Alert */}
        {verifyMessage && (
          <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
            verifyMessage.includes('✅')
              ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
              : 'bg-amber-950/50 border border-amber-800 text-amber-300'
          }`}>
            <span>{verifyMessage}</span>
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
          {isVerifying ? 'Verificando conexão...' : 'Já executei no Supabase, verificar agora'}
        </button>
      </div>
    </div>,
    document.body
  );
};
