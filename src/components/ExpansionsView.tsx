import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Filter, FolderTree, RefreshCw, Sparkles } from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { SetSyncService } from '../services/setSyncService';
import { StorageService } from '../services/storage';
import { CardLanguage, CardSet } from '../types';

interface ExpansionsViewProps {
  preferredLanguage: CardLanguage;
  onOpenBinderForSet: (setId: string) => void;
}

export const ExpansionsView: React.FC<ExpansionsViewProps> = ({
  preferredLanguage,
  onOpenBinderForSet,
}) => {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('');

  // Filters state
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedSeries, setSelectedSeries] = useState<string>('Todas');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name' | 'progress'>('recent');

  const loadCatalogSets = async () => {
    setLoading(true);
    const data = await CardProvider.getSets(preferredLanguage);
    setSets(data);
    setLastSyncText(SetSyncService.getLastSyncTimestamp());
    setLoading(false);
  };

  useEffect(() => {
    loadCatalogSets();
  }, [preferredLanguage]);

  const handleManualSync = async () => {
    setSyncing(true);
    await SetSyncService.syncSets(preferredLanguage);
    await loadCatalogSets();
    setSyncing(false);
  };

  const collection = StorageService.getCollection();
  const setCollectionMap: Record<string, Set<string>> = {};
  collection.forEach((item) => {
    const parts = item.cardId.split('-');
    const setId = parts[0];
    if (setId) {
      if (!setCollectionMap[setId]) setCollectionMap[setId] = new Set();
      setCollectionMap[setId].add(item.cardId);
    }
  });

  // Extract unique series
  const seriesList = Array.from(new Set(sets.map((s) => s.series).filter(Boolean)));

  // Filter and sort
  let filteredSets = [...sets];

  if (selectedYear !== 'Todos') {
    filteredSets = filteredSets.filter((s) => {
      if (!s.releaseDate) return selectedYear === 'Outras';
      const year = new Date(s.releaseDate).getFullYear().toString();
      if (selectedYear === 'Mais Antigas') {
        return parseInt(year, 10) <= 2022;
      }
      return year === selectedYear;
    });
  }

  if (selectedSeries !== 'Todas') {
    filteredSets = filteredSets.filter((s) => s.series?.toLowerCase() === selectedSeries.toLowerCase());
  }

  filteredSets.sort((a, b) => {
    const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
    const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;

    if (sortBy === 'recent') return dateB - dateA;
    if (sortBy === 'oldest') return dateA - dateB;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'progress') {
      const ownedA = setCollectionMap[a.id]?.size || 0;
      const ownedB = setCollectionMap[b.id]?.size || 0;
      return ownedB - ownedA;
    }
    return 0;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                Expansões Pokémon TCG
                <span className="text-xs font-mono font-normal bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {sets.length} coleções
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Sincronização dinâmica incluindo lançamentos recentes de 2025 e 2026
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right text-[11px] font-mono text-slate-400 hidden sm:block">
              Última sincronização: <span className="text-slate-200">{lastSyncText}</span>
            </div>

            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Atualizar Catálogo'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Controls Bar */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Year Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {['Todos', '2026', '2025', '2024', '2023', 'Mais Antigas'].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedYear === year
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {year === '2026' || year === '2025' ? `★ ${year}` : year}
              </button>
            ))}
          </div>

          {/* Series & Order Selectors */}
          <div className="flex items-center gap-2">
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="Todas">Todas as Séries</option>
              {seriesList.map((s) => (
                <option key={s} value={s!}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="recent">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="name">Nome (A-Z)</option>
              <option value="progress">Mais completas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Expansions */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-36 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
          Nenhuma expansão encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredSets.map((s) => {
            const owned = setCollectionMap[s.id] ? setCollectionMap[s.id].size : 0;
            const official = s.cardCount?.official || 100;
            const percentage = Math.min(100, Math.round((owned / official) * 1000) / 10);
            const formattedDate = s.releaseDate
              ? new Date(s.releaseDate).toLocaleDateString('pt-BR')
              : 'N/D';

            return (
              <div
                key={s.id}
                onClick={() => onOpenBinderForSet(s.id)}
                className="group bg-slate-900 border border-slate-800 hover:border-red-500 rounded-2xl p-5 cursor-pointer transition-all space-y-3 shadow-lg hover:scale-[1.01] flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {s.logo ? (
                        <img src={s.logo} alt={s.name} className="h-8 object-contain max-w-[100px]" />
                      ) : (
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-xs text-white">
                          {s.code || 'SET'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-white text-sm group-hover:text-red-400 line-clamp-1">
                          {s.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {s.series || 'Pokémon TCG'} • {formattedDate}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-black text-amber-400 font-mono flex-shrink-0">
                      {percentage}%
                    </span>
                  </div>

                  {owned > 0 && (
                    <div className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Na minha coleção ({owned} cartas)
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Cartas: <strong className="text-white">{owned}</strong> / {official}
                    </span>
                    <button className="px-3 py-1 rounded-xl bg-slate-800 group-hover:bg-red-600 text-white font-bold text-xs flex items-center gap-1 transition-colors">
                      Abrir Fichário <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-amber-400 rounded-full"
                      style={{ width: `${Math.max(2, percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
