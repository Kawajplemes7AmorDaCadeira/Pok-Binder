import React, { useState } from 'react';
import {
  BookOpen,
  Camera,
  FolderTree,
  Layers,
  Search,
  Sword,
  MoreHorizontal,
  TrendingUp,
  ArrowRightLeft,
  Heart,
  Sparkles,
  Zap,
  Clock,
  Copy,
  X,
} from 'lucide-react';
import { ActiveTab } from './Header';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenScanner: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainItems = [
    { id: 'dashboard', label: 'Início', icon: Layers },
    { id: 'catalog', label: 'Catálogo', icon: BookOpen },
    // Center is Scanner
    { id: 'binder', label: 'Fichário', icon: FolderTree },
    { id: 'more', label: 'Mais', icon: MoreHorizontal },
  ] as const;

  const extraMenuItems: { id: ActiveTab; label: string; icon: any; color: string; badge?: string }[] = [
    { id: 'collection', label: 'Minha Coleção', icon: Search, color: 'text-amber-400 bg-amber-500/10' },
    { id: 'decks', label: 'Criador de Decks', icon: Sword, color: 'text-red-400 bg-red-500/10' },
    { id: 'arena', label: 'Arena de Batalha', icon: Zap, color: 'text-violet-400 bg-violet-500/10', badge: 'Novo' },
    { id: 'market', label: 'Mercado & Cotações', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10' },
    { id: 'trades', label: 'Gestor de Trocas', icon: ArrowRightLeft, color: 'text-blue-400 bg-blue-500/10' },
    { id: 'wishlist', label: 'Lista de Desejos', icon: Heart, color: 'text-rose-400 bg-rose-500/10' },
    { id: 'ai-coach', label: 'IA PokéCoach', icon: Sparkles, color: 'text-cyan-400 bg-cyan-500/10' },
    { id: 'duplicates', label: 'Cartas Repetidas', icon: Copy, color: 'text-orange-400 bg-orange-500/10' },
    { id: 'timeline', label: 'Linha do Tempo', icon: Clock, color: 'text-indigo-400 bg-indigo-500/10' },
  ];

  return (
    <>
      {/* "Mais" Mobile Bottom Drawer Sheet */}
      {isMoreMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          <div className="bg-[#0b1329] border-t border-slate-800 rounded-t-3xl p-5 pb-24 shadow-2xl max-h-[80vh] overflow-y-auto space-y-4 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-white font-black text-base">Menu Completo</h3>
                <p className="text-slate-400 text-xs">Recursos e ferramentas do PokéBinder</p>
              </div>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {extraMenuItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all relative ${
                      isSelected
                        ? 'bg-red-600/20 border-red-500 text-white shadow-lg'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.badge && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-black uppercase rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Elevated Mobile Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080d1b]/95 border-t border-slate-800/90 backdrop-blur-xl px-2 py-2 shadow-2xl safe-area-pb">
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          {/* First two items */}
          {mainItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setActiveTab(item.id as ActiveTab);
                }}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-[10px] font-bold transition-all ${
                  isActive
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-red-500 scale-110' : ''} transition-transform`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Center Elevated Camera Scanner Trigger */}
          <div className="relative -top-4 flex flex-col items-center">
            <button
              onClick={onOpenScanner}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-amber-500 p-0.5 shadow-lg shadow-red-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
              title="Escanear Carta com Câmera"
            >
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center group-hover:bg-transparent transition-colors">
                <Camera className="w-6 h-6 text-white animate-pulse" />
              </div>
            </button>
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider mt-0.5">
              Scan
            </span>
          </div>

          {/* Last two items */}
          {mainItems.slice(2).map((item) => {
            const Icon = item.icon;
            const isMore = item.id === 'more';
            const isActive = isMore
              ? isMoreMenuOpen || extraMenuItems.some((m) => m.id === activeTab)
              : activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isMore) {
                    setIsMoreMenuOpen(!isMoreMenuOpen);
                  } else {
                    setIsMoreMenuOpen(false);
                    setActiveTab(item.id as ActiveTab);
                  }
                }}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-[10px] font-bold transition-all ${
                  isActive
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-red-500 scale-110' : ''} transition-transform`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
