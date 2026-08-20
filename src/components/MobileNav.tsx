import React from 'react';
import { BookOpen, FolderTree, Layers, Search, Sword } from 'lucide-react';
import { ActiveTab } from './Header';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: 'dashboard', label: 'Início', icon: Layers },
    { id: 'catalog', label: 'Catálogo', icon: BookOpen },
    { id: 'binder', label: 'Fichário', icon: FolderTree },
    { id: 'decks', label: 'Decks', icon: Sword },
    { id: 'collection', label: 'Coleção', icon: Search },
  ] as const;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg px-2 py-2 shadow-2xl">
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[10px] font-semibold transition-all ${
                isActive
                  ? 'bg-red-600/90 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
