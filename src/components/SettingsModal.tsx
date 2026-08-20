import React, { useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  Moon,
  ShieldCheck,
  Sun,
  Upload,
  User,
  X,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { CardLanguage, UserSettings } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  preferredLanguage: CardLanguage;
  setPreferredLanguage: (lang: CardLanguage) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  onDataRestored?: () => void;
  onOpenDiagnostic?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  preferredLanguage,
  setPreferredLanguage,
  theme,
  setTheme,
  onDataRestored,
  onOpenDiagnostic,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  const handleBackupExport = () => {
    const json = StorageService.exportFullBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokebinder_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = StorageService.importFullBackupJSON(content);
      if (success) {
        setImportStatus('✓ Backup restaurado com sucesso!');
        if (onDataRestored) onDataRestored();
      } else {
        setImportStatus('❌ Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Configurações & Backup</h2>
            <p className="text-xs text-slate-400">Ajustes do aplicativo e segurança de dados</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Language Preference */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-red-500" />
              Idioma Preferencial das Cartas
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPreferredLanguage('pt')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  preferredLanguage === 'pt' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Português
              </button>
              <button
                onClick={() => setPreferredLanguage('en')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  preferredLanguage === 'en' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setPreferredLanguage('ja')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  preferredLanguage === 'ja' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                日本語
              </button>
            </div>
          </div>

          {/* Theme Preference */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-2">
              Tema da Interface
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-colors ${
                  theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <Moon className="w-4 h-4" /> Escuro
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-colors ${
                  theme === 'light' ? 'bg-slate-200 text-slate-950 border-white' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <Sun className="w-4 h-4" /> Claro
              </button>
            </div>
          </div>

          {/* Catalog Diagnostic Tools */}
          {onOpenDiagnostic && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Diagnóstico do Catálogo
              </span>
              <p className="text-[11px] text-slate-400">
                Verifique erros de integridade, imagens ausentes e status de sincronização das coleções.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenDiagnostic();
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider"
              >
                Abrir Diagnóstico do Catálogo
              </button>
            </div>
          )}

          {/* Backup Section */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 block">Backup & Restauração</span>
            <p className="text-[11px] text-slate-400">
              Exporte sua coleção e decks em formato JSON para evitar perda de dados.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleBackupExport}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-blue-400" /> Exportar JSON
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-emerald-400" /> Importar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleBackupImport}
                className="hidden"
              />
            </div>

            {importStatus && (
              <div className="text-xs font-bold text-center mt-2">{importStatus}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
