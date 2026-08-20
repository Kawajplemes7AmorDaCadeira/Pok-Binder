/**
 * AuthModal.tsx - User Login and Cloud Synchronization Account Modal.
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, LogIn, LogOut, Cloud, ShieldCheck, Mail, Lock, CheckCircle2, Sparkles, X, Copy, Download, Upload, ArrowRightLeft } from 'lucide-react';
import { AuthService, UserProfile } from '../../services/sync/AuthService';
import { SyncService } from '../../services/sync/SyncService';
import { BackupService } from '../../services/backup/backupService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAuthChange: (user: UserProfile | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthChange,
}) => {
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [transferStatus, setTransferStatus] = useState('');

  const handleGenerateTransferCode = async () => {
    try {
      const jsonStr = await BackupService.exportBackupJSON();
      const code = btoa(encodeURIComponent(jsonStr));
      setTransferCode(code);
      setTransferStatus('Código gerado! Copie e cole no outro aparelho.');
    } catch (e: any) {
      setTransferStatus('Erro ao gerar: ' + e?.message);
    }
  };

  const handleImportTransferCode = async () => {
    if (!transferCode.trim()) {
      setTransferStatus('Cole o código de sincronização.');
      return;
    }
    try {
      const jsonStr = decodeURIComponent(atob(transferCode.trim()));
      const report = await BackupService.importBackupJSON(jsonStr);
      if (report.success) {
        setTransferStatus(`Sucesso! ${report.importedCollectionCount} cartas importadas. Atualizando...`);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setTransferStatus('Erro ao importar dados.');
      }
    } catch (e: any) {
      setTransferStatus('Código inválido ou corrompido.');
    }
  };

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await AuthService.loginWithGoogle();
      await SyncService.migrateLocalDataToCloud(user);
      onAuthChange(user);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Erro ao entrar com Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await AuthService.loginWithEmail(email, password);
      await SyncService.migrateLocalDataToCloud(user);
      onAuthChange(user);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    onAuthChange(null);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#080d1b] border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {currentUser ? (
          <div className="space-y-5 text-center pt-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conta Conectada</span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Sincronizado
              </span>
            </div>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mx-auto flex items-center justify-center border border-emerald-400/40 shadow-lg shadow-emerald-500/20 text-white font-black text-2xl">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{currentUser.name}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" /> Transferência PC ⇄ Celular
                </span>
                {transferCode && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(transferCode);
                      setTransferStatus('Código copiado para a área de transferência!');
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20"
                  >
                    <Copy className="w-3 h-3" /> Copiar Código
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Gere o código no PC e cole no celular para sincronizar instantaneamente sem erros de rede.
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
                className="w-full h-16 bg-slate-900 border border-slate-800 rounded-xl p-2 text-[10px] font-mono text-slate-200 resize-none focus:outline-none focus:border-red-500 select-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateTransferCode}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Gerar (PC)
                </button>
                <button
                  onClick={handleImportTransferCode}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Upload className="w-3.5 h-3.5" /> Importar (Celular)
                </button>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" /> Sair da conta
            </button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 mx-auto flex items-center justify-center shadow-lg shadow-red-500/30 text-white">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Sincronização PokéBinder</h3>
              <p className="text-xs text-slate-400">
                Acesse sua conta para usar a mesma coleção no PC e no celular.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
                {error}
              </div>
            )}

            {!isEmailMode ? (
              <div className="space-y-3">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.18 21.34 7.22 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.87 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.18 2.66 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                  Continuar com Google
                </button>

                <button
                  onClick={() => setIsEmailMode(true)}
                  className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Mail className="w-3.5 h-3.5" /> Entrar com E-mail e Senha
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEmailMode(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </div>
              </form>
            )}

            <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
              Ao continuar, seus dados serão sincronizados com segurança em todos os seus dispositivos.
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
