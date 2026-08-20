/**
 * AuthModal.tsx - Real Supabase Cloud Authentication & Multi-Device Sync Modal
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, LogIn, LogOut, Cloud, ShieldCheck, Mail, Lock, CheckCircle2, AlertCircle, X, Copy, Download, Upload, ArrowRightLeft, RefreshCw, Smartphone, Monitor, Database, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';
import { BackupService } from '../../services/backup/backupService';
import { SyncService } from '../../services/cloud/sync/SyncService';
import { DatabaseSetupModal } from './DatabaseSetupModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onAuthChange?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, isConfigured, signInWithGoogle, signInWithPassword, signUp, signOut } = useAuth();
  const { status, syncNow, migrateLocalData } = useSync();

  const [authTab, setAuthTab] = useState<'login' | 'signup' | 'code'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDbSetupOpen, setIsDbSetupOpen] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        if (res.error.toLowerCase().includes('provider is not enabled') || res.error.toLowerCase().includes('unsupported provider')) {
          setError('O provedor Google ainda precisa ser ativado no painel do Supabase. Use E-mail e Senha abaixo para sincronizar no PC e celular imediatamente!');
          setAuthTab('login');
        } else {
          setError(res.error);
        }
      } else {
        setSuccessMsg('Redirecionando para login com Google...');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao entrar com Google');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (authTab === 'signup') {
        const res = await signUp(email, password, displayName);
        if (res.error) {
          if (res.error.toLowerCase().includes('already registered') || res.error.toLowerCase().includes('already exists')) {
            const loginRes = await signInWithPassword(email, password);
            if (loginRes.error) {
              setError('Essa conta já existe. Por favor, use a aba "Entrar" com a senha correta.');
            } else {
              setSuccessMsg('Conta conectada com sucesso! Sincronizando coleção com o Supabase...');
              await migrateLocalData();
              await syncNow();
              setTimeout(() => { onClose(); }, 1500);
            }
          } else {
            setError(res.error);
          }
        } else {
          setSuccessMsg('Conta criada com sucesso! Sincronizando todas as cartas com a nuvem...');
          await migrateLocalData();
          await syncNow();
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        const res = await signInWithPassword(email, password);
        if (res.error) {
          if (res.error.toLowerCase().includes('invalid login credentials')) {
            // Attempt auto sign up if this was a new user
            const signupRes = await signUp(email, password);
            if (!signupRes.error) {
              setSuccessMsg('Conta criada e conectada com sucesso! Sincronizando dados...');
              await migrateLocalData();
              await syncNow();
              setTimeout(() => { onClose(); }, 1500);
              return;
            }
            setError('Credenciais incorretas. Se ainda não tem cadastro, use a aba "Criar Conta".');
          } else {
            setError(res.error);
          }
        } else {
          setSuccessMsg('Login realizado com sucesso! Sincronizando dados...');
          await migrateLocalData();
          await syncNow();
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await migrateLocalData();
      await syncNow();
      setSuccessMsg('Sincronização concluída com sucesso!');
    } catch (e: any) {
      setError('Falha na sincronização: ' + e?.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateTransferCode = async () => {
    try {
      const jsonStr = await BackupService.exportBackupJSON();
      const code = btoa(encodeURIComponent(jsonStr));
      setTransferCode(code);
      setTransferStatus('Código gerado! Copie e envie para o outro dispositivo.');
    } catch (e: any) {
      setTransferStatus('Erro ao gerar: ' + e?.message);
    }
  };

  const handleImportTransferCode = async () => {
    if (!transferCode.trim()) {
      setTransferStatus('Cole o código gerado no outro dispositivo.');
      return;
    }
    try {
      const jsonStr = decodeURIComponent(atob(transferCode.trim()));
      const report = await BackupService.importBackupJSON(jsonStr);
      if (report.success) {
        setTransferStatus(`Sucesso! ${report.importedCollectionCount} cartas importadas. Atualizando aplicativo...`);
        if (user) {
          await migrateLocalData();
        }
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setTransferStatus('Erro ao importar dados. Verifique se o código está completo.');
      }
    } catch (e: any) {
      setTransferStatus('Código inválido ou corrompido.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#080d1b] border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {user ? (
          <div className="space-y-5 text-center pt-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conta Conectada</span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Nuvem Supabase Ativa
              </span>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mx-auto flex items-center justify-center border border-emerald-400/40 shadow-lg shadow-emerald-500/20 text-white font-black text-2xl">
              {(user.user_metadata?.display_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {user.user_metadata?.display_name || 'Treinador Conectado'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
            </div>

            {/* Sync Now / Action Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-emerald-400" /> Status da Sincronização
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {status.isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>

              {status.isSchemaMissing && (
                <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-200">
                    <Database className="w-4 h-4 text-amber-400 shrink-0" />
                    Tabelas não encontradas no Supabase
                  </div>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    Execute o script SQL com 1 clique no editor do Supabase para começar a salvar suas cartas na nuvem.
                  </p>
                  <button
                    onClick={() => setIsDbSetupOpen(true)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                  >
                    <Terminal className="w-3.5 h-3.5" /> 📋 Copiar Script SQL do Banco
                  </button>
                </div>
              )}

              {status.pendingCount > 0 && (
                <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/80 text-blue-300 text-xs">
                  {status.pendingCount} alteração(ões) pendente(s) para subir.
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Coleção Agora'}
              </button>

              <button
                onClick={() => setIsDbSetupOpen(true)}
                className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-red-400" /> Script SQL / Gerenciar Tabelas do Supabase
              </button>
            </div>

            {/* Direct Sync Code Box as Fail-Safe */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" /> Transferência Direta PC ⇄ Celular
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Você pode gerar um código no PC e colar no celular para transferir sua coleção imediatamente!
              </p>
              {transferStatus && (
                <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 text-[11px] font-mono">
                  {transferStatus}
                </div>
              )}
              <textarea
                value={transferCode}
                onChange={(e) => setTransferCode(e.target.value)}
                placeholder="Cole o código aqui ou clique em Gerar..."
                className="w-full h-14 bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] font-mono text-slate-200 resize-none focus:outline-none focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateTransferCode}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Monitor className="w-3.5 h-3.5 text-sky-400" /> Gerar Código (PC)
                </button>
                <button
                  onClick={handleImportTransferCode}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Smartphone className="w-3.5 h-3.5 text-white" /> Importar (Celular)
                </button>
              </div>
            </div>

            <button
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" /> Sair da conta
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 mx-auto flex items-center justify-center shadow-lg shadow-red-500/30 text-white">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Sincronização em Nuvem</h3>
              <p className="text-xs text-slate-400">
                Acesse sua conta para ver as mesmas cartas no PC e no celular em tempo real.
              </p>
            </div>

            {/* Tab switch */}
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => { setAuthTab('login'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  authTab === 'login' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => { setAuthTab('signup'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  authTab === 'signup' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
              <button
                onClick={() => { setAuthTab('code'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-1.5 rounded-xl transition-all ${
                  authTab === 'code' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Código PC ⇄ Celular
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {authTab === 'code' ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-3 text-xs">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sem internet ou sem login? Gere o código de sincronização no seu PC e cole no seu celular para clonar toda a coleção instantaneamente!
                </p>
                {transferStatus && (
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 text-[11px] font-mono">
                    {transferStatus}
                  </div>
                )}
                <textarea
                  value={transferCode}
                  onChange={(e) => setTransferCode(e.target.value)}
                  placeholder="Cole o código do PC aqui..."
                  className="w-full h-16 bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] font-mono text-slate-200 resize-none focus:outline-none focus:border-red-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerateTransferCode}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Monitor className="w-3.5 h-3.5 text-sky-400" /> Gerar Código (PC)
                  </button>
                  <button
                    onClick={handleImportTransferCode}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-red-500/20"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-white" /> Importar (Celular)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Google Sign In Option */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.18 21.34 7.22 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.87 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.18 2.66 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                  Continuar com Google
                </button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[10px] uppercase font-bold text-slate-500">ou use e-mail e senha</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Email / Password Form */}
                <form onSubmit={handlePasswordAuth} className="space-y-3">
                  {authTab === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-medium">Nome de Treinador</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ex: Ash Ketchum"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-medium">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20 disabled:opacity-50 mt-1"
                  >
                    {loading
                      ? 'Processando...'
                      : authTab === 'signup'
                      ? 'Criar Conta e Sincronizar'
                      : 'Entrar na Conta'}
                  </button>
                </form>
              </div>
            )}

            <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
              Ao entrar no PC e no celular com a mesma conta, todas as cartas e decks sincronizam automaticamente.
            </div>
          </div>
        )}
      </div>

      {/* Database SQL Setup Modal */}
      <DatabaseSetupModal isOpen={isDbSetupOpen} onClose={() => setIsDbSetupOpen(false)} />
    </div>,
    document.body
  );
};
