import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  Copy,
  FolderTree,
  Heart,
  History,
  Layers,
  Search,
  Sliders,
  Sword,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ActiveTab } from './Header';
import { useGlobalState } from '../context/GlobalStateContext';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [totalOwned, setTotalOwned] = useState(0);
  const { theme } = useGlobalState();

  useEffect(() => {
    const updateStats = () => {
      const items = StorageService.getCollection();
      const uniqueCount = new Set(items.map((i) => i.cardId)).size;
      setTotalOwned(uniqueCount);
    };

    updateStats();
    window.addEventListener('storage', updateStats);
    return () => window.removeEventListener('storage', updateStats);
  }, [activeTab]);

  const targetGoal = 2500;
  const progressPercent = Math.min(100, Math.round((totalOwned / targetGoal) * 100));
  const trainerLevel = Math.max(1, Math.floor(totalOwned / 25) + 1);

  const mainMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'catalog', label: 'Catálogo', icon: BookOpen },
    { id: 'binder', label: 'Fichário Digital', icon: FolderTree },
    { id: 'decks', label: 'Meus Decks', icon: Sword },
    { id: 'arena', label: 'Arena de Teste', icon: Zap },
    { id: 'ai-coach', label: 'Laboratório IA', icon: Sparkles },
  ] as const;

  const collectionMenu = [
    { id: 'collection', label: 'Minha Coleção', icon: CheckCircle2 },
    { id: 'expansions', label: 'Expansões', icon: Sliders },
    { id: 'missing', label: 'Faltantes', icon: Search },
    { id: 'duplicates', label: 'Duplicadas', icon: Copy },
    { id: 'favorites', label: 'Favoritas', icon: Heart },
    { id: 'wishlist', label: 'Wishlist (Desejos)', icon: Heart },
  ] as const;

  const marketMenu = [
    { id: 'market', label: 'Mercado & Cotações', icon: TrendingUp },
    { id: 'trades', label: 'Central de Trocas', icon: ArrowLeftRight },
    { id: 'timeline', label: 'Linha do Tempo', icon: History },
  ] as const;

  const renderNavGroup = (title: string, items: readonly { id: string; label: string; icon: any }[]) => (
    <div>
      <h3
        className={`text-[10px] uppercase font-bold tracking-[0.14em] mb-1.5 px-3 ${
          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        {title}
      </h3>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-red-500/10 text-red-400 font-bold shadow-[0_0_16px_rgba(239,68,68,0.1)] border border-red-500/25'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 hover:translate-x-0.5'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-red-500 rounded-r-full shadow-[0_0_8px_#ef4444]" />
              )}
              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside
      className={`hidden lg:flex w-64 p-4 flex-col justify-between shrink-0 select-none border-r transition-all duration-300 overflow-y-auto ${
        theme === 'dark'
          ? 'bg-[#080e1e]/95 border-slate-800/90 text-white backdrop-blur-md'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="space-y-4">
        {renderNavGroup('Navegação Principal', mainMenu)}
        {renderNavGroup('Coleção', collectionMenu)}
        {renderNavGroup('Mercado & Gestão', marketMenu)}
      </div>

      {/* Trainer Level & Progress Card */}
      <div
        className={`p-3.5 mt-4 rounded-2xl border space-y-2.5 transition-all duration-300 relative overflow-hidden shrink-0 ${
          theme === 'dark' ? 'bg-[#0a1224] border-slate-800/90 shadow-md' : 'bg-slate-50 border-slate-200/80 shadow-sm'
        }`}
      >
        <div className="flex justify-between items-center z-10 relative">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-black">
              ★
            </div>
            <div>
              <span className={`text-[11px] font-bold block leading-none ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                Treinador
              </span>
              <span className="text-[10px] text-amber-400 font-bold font-mono">
                Nv. {trainerLevel}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className={`text-xs font-black font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {totalOwned} <span className="text-slate-500 font-normal text-[10px]">/ {targetGoal} XP</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          className={`w-full h-2 rounded-full overflow-hidden border p-0.5 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700/50' : 'bg-slate-200 border-slate-300/50'
          }`}
        >
          <div
            className="bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            style={{ width: `${Math.max(3, progressPercent)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          <span>Colecionador TCG</span>
          <span>{progressPercent}% Completo</span>
        </div>
      </div>
    </aside>
  );
};
