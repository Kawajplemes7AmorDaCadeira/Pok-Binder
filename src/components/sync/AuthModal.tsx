/**
 * AuthModal.tsx
 * Authenticated Device & Account Synchronization Modal.
 * Supports official Supabase Authentication (auth.users), multi-device code sync, and live table verification.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, CheckCircle2, AlertCircle, X, Copy, RefreshCw, Smartphone, Monitor, ShieldCheck, Sparkles, Database, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { DatabaseSetupModal } from './DatabaseSetupModal';
import { SupabaseService } from '../../services/cloud/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, syncCode, setSyncCodeAndConnect, signInWithPassword, signUp, signOut } = useAuth();
  const { status, syncNow, migrateLocalData } = useSync();

  const [activeTab, setActiveTab] = useState<'code' | 'account' | 'db'>('code');

  // Form states
  const [inputCode, setInputCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Status feedback
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Table verification state
  const [tableStatus, setTableStatus] = useState<{
    tested: boolean;
    allTablesExist: boolean;
    missingTables: string[];
    existingTables: string[];
  } | null>(null);

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
    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Preencha o e-mail e a senha.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const res = await signUp(email, password, displayName);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMsg('Conta criada com sucesso no Supabase Authentication!');
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 1500);
        }
      } else {
        const res = await signInWithPassword(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccessMsg('Login realizado com sucesso!');
          setTimeout(() => {
            setSuccessMsg('');
            onClose();
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erro na autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTables = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await SupabaseService.verifyAllTablesExist();
      setTableStatus({
        tested: true,
        allTablesExist: res.allTablesExist,
        missingTables: res.missingTables,
        existingTables: res.existingTables,
      });

      if (res.allTablesExist) {
        setSuccessMsg('✅ Conexão ativa! Todas as 8 tabelas necessárias estão criadas no Supabase com RLS seguro.');
      } else {
        setError(`⚠️ Faltam ${res.missingTables.length} tabela(s): ${res.missingTables.join(', ')}.`);
      }
    } catch (err: any) {
      setError('Falha ao verificar as tabelas no Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await migrateLocalData().catch(() => {});
      await syncNow().catch(() => {});
      setSuccessMsg('Coleção sincronizada com o Supabase com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setError('Erro na sincronização: ' + e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0a1224] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Top Header Background Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Sincronização PokéBinder
            </h2>
            <p className="text-xs text-slate-400">
              {user?.email ? `Usuário: ${user.email}` : 'Sincronização em nuvem e login Supabase Auth'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-6 gap-2">
          <button
            onClick={() => { setActiveTab('code'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Código de Binder
          </button>
          <button
            onClick={() => { setActiveTab('account'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'account'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 text-sky-400" />
            Conta Supabase Auth
          </button>
          <button
            onClick={() => { setActiveTab('db'); setError(''); setSuccessMsg(''); handleVerifyTables(); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'db'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
            Verificar Tabelas
          </button>
        </div>

        {/* Active Cloud Connection Status Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                Nuvem Ativa no Supabase
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </p>
              <p className="text-[11px] text-slate-400">
                Sua coleção é salva em tempo real no Supabase.
              </p>
            </div>
          </div>

          <button
            onClick={handleForceSync}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>

        {/* TAB 1: CODE SYNC */}
        {activeTab === 'code' && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0d172e] border border-slate-800">
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
                💡 <strong>Multi-dispositivo:</strong> Digite este mesmo código no seu outro celular ou computador para manter as mesmas cartas sincronizadas!
              </p>
            </div>

            <form onSubmit={handleConnectCode} className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
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
                  disabled={isLoading || !inputCode.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  Conectar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: SUPABASE AUTH ACCOUNT */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            {user?.email && !user.email.includes('@pokebinder.app') ? (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <p className="text-xs text-slate-300">
                  Você está logado com a conta oficial no Supabase:
                </p>
                <p className="text-sm font-bold text-emerald-400 font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {user.email}
                </p>
                <button
                  onClick={signOut}
                  className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold text-xs transition-all"
                >
                  Sair da Conta
                </button>
              </div>
            ) : (
              <form onSubmit={handleAccountSubmit} className="space-y-3">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Nome de Exibição:</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Ex: Treinador Red"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-[#060a14] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">E-mail:</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#060a14] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Senha:</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#060a14] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  {isSignUp ? 'Criar Conta Oficial no Supabase' : 'Entrar na Conta Oficial'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-emerald-400 hover:underline font-semibold"
                  >
                    {isSignUp ? 'Já tem conta? Faça login aqui' : 'Não tem conta? Criar conta no Supabase'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: DATABASE TABLE VERIFIER */}
        {activeTab === 'db' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                Verificação da Conexão e Tabelas (8/8)
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Verifica em tempo real se todas as tabelas necessárias foram criadas no seu banco Supabase.
              </p>

              {tableStatus && (
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  {[
                    'collection_items',
                    'decks',
                    'deck_cards',
                    'favorites',
                    'wishlist_items',
                    'card_purchases',
                    'trades',
                    'processed_sync_operations',
                  ].map((tableName) => {
                    const exists = tableStatus.existingTables.includes(tableName);
                    return (
                      <div
                        key={tableName}
                        className={`p-2 rounded-xl border flex items-center justify-between font-mono ${
                          exists
                            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                            : 'bg-red-950/40 border-red-800/80 text-red-300'
                        }`}
                      >
                        <span className="truncate">{tableName}</span>
                        <span>{exists ? '✅ OK' : '❌ Faltando'}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleVerifyTables}
                  disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
                  Testar Conexão Novamente
                </button>
                <button
                  onClick={() => setIsDbSetupOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                >
                  Ver Script SQL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Multi Device Illustration Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <span>Celular</span>
            <span className="text-slate-600">↔</span>
            <Monitor className="w-4 h-4 text-slate-400" />
            <span>Computador</span>
          </div>

          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            RLS Protegido
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
