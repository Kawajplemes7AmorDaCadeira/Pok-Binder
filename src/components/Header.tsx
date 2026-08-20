import React from 'react';
import {
  BookOpen,
  Camera,
  CheckCircle2,
  Copy,
  FolderTree,
  Heart,
  Layers,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Sword,
  User,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { CardLanguage } from '../types';
import { SyncStatusIndicator } from './sync/SyncStatusIndicator';

export type ActiveTab =
  | 'dashboard'
  | 'catalog'
  | 'binder'
  | 'collection'
  | 'expansions'
  | 'decks'
  | 'duplicates'
  | 'missing'
  | 'favorites'
  | 'wishlist'
  | 'market'
  | 'trades'
  | 'timeline'
  | 'admin'
  | 'settings'
  | 'ai-coach'
  | 'arena';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  preferredLanguage: CardLanguage;
  setPreferredLanguage: (lang: CardLanguage) => void;
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  theme,
  setTheme,
  preferredLanguage,
  setPreferredLanguage,
  onOpenSettings,
  onOpenAdmin,
  onOpenScanner,
}) => {
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <nav
      className={`h-16 w-full border-b flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 backdrop-blur-xl transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-[#080d1b]/90 border-slate-800/80 text-white shadow-sm'
          : 'bg-white/90 border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      {/* Brand Logo */}
      <div
        onClick={() => setActiveTab('dashboard')}
        className="flex items-center gap-3 cursor-pointer group select-none"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center border border-red-400/40 shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_6px_white]" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-black text-lg md:text-xl tracking-tight transition-colors ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          >
            Poké<span className="text-red-500">Binder</span>
          </span>
          <span
            className={`hidden sm:inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-all ${
              theme === 'dark'
                ? 'text-slate-400 bg-slate-800/80 border border-slate-700/60'
                : 'text-slate-600 bg-slate-100 border border-slate-200'
            }`}
          >
            TCG PRO
          </span>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-md mx-6 relative hidden md:block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none opacity-75" />
        <input
          type="text"
          placeholder="Pesquisar cartas, expansões, coleções, artistas..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (activeTab !== 'catalog' && activeTab !== 'decks') {
              setActiveTab('catalog');
            }
          }}
          className={`w-full border rounded-xl py-2 pl-10 pr-8 text-xs transition-all focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 ${
            theme === 'dark'
              ? 'bg-[#0a1224] border-slate-800 text-white placeholder-slate-500'
              : 'bg-slate-100 border-slate-300 text-slate-800 placeholder-slate-500'
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Right Controls Bar */}
      <div className="flex items-center gap-2.5">
        {/* Cloud Sync Status & Account */}
        <SyncStatusIndicator />

        {/* Offline Status Badge */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Offline
          </div>
        )}

        {/* Segmented Language Selector */}
        <div
          className={`flex items-center rounded-xl p-1 border text-[11px] font-bold transition-all ${
            theme === 'dark'
              ? 'bg-[#0a1224] border-slate-800 text-slate-300'
              : 'bg-slate-100 border-slate-300 text-slate-700'
          }`}
        >
          <button
            onClick={() => setPreferredLanguage('pt')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              preferredLanguage === 'pt'
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PT
          </button>
          <button
            onClick={() => setPreferredLanguage('en')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              preferredLanguage === 'en'
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setPreferredLanguage('ja')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              preferredLanguage === 'ja'
                ? 'bg-red-600 text-white shadow-sm shadow-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            JA
          </button>
        </div>

        {/* Camera Card Scanner Trigger Button */}
        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            className="p-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-sm shadow-red-600/30 transition-all flex items-center gap-1.5"
            title="Escanear Carta com a Câmera"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-black">Scan</span>
          </button>
        )}

        {/* Admin Integrity Tool Button */}
        <button
          onClick={onOpenAdmin}
          className={`p-2 rounded-xl border transition-all ${
            theme === 'dark'
              ? 'bg-[#0a1224] border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-400/40'
              : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-amber-500'
          }`}
          title="Verificar Integridade do Catálogo"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-2 rounded-xl border transition-all ${
            theme === 'dark'
              ? 'bg-[#0a1224] border-slate-800 text-slate-400 hover:text-amber-300 hover:border-slate-700'
              : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-amber-500'
          }`}
          title="Alternar Tema Escuro/Claro"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-xl border transition-all ${
            theme === 'dark'
              ? 'bg-[#0a1224] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
          }`}
          title="Configurações & Backup"
        >
          <User className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
