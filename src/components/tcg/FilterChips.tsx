import React from 'react';
import { X, RotateCcw } from 'lucide-react';

interface FilterChipsProps {
  searchQuery: string;
  onClearSearch: () => void;
  selectedExpansion: string;
  expansionName?: string;
  onClearExpansion: () => void;
  selectedVariant: string;
  onClearVariant: () => void;
  filterDuplicatesOnly: boolean;
  onToggleDuplicates: () => void;
  onClearAll: () => void;
  totalFiltered: number;
  totalTotal: number;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  searchQuery,
  onClearSearch,
  selectedExpansion,
  expansionName,
  onClearExpansion,
  selectedVariant,
  onClearVariant,
  filterDuplicatesOnly,
  onToggleDuplicates,
  onClearAll,
  totalFiltered,
  totalTotal,
}) => {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    selectedExpansion !== 'all' ||
    selectedVariant !== 'all' ||
    filterDuplicatesOnly;

  if (!hasActiveFilters && totalTotal > 0) {
    return (
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
        <span>Exibindo todas as <strong>{totalTotal}</strong> cartas</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
      {/* Active Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 mr-1">Filtros:</span>

        {searchQuery && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold">
            <span>Busca: "{searchQuery}"</span>
            <button
              onClick={onClearSearch}
              className="p-0.5 hover:text-white rounded transition-colors"
              aria-label="Limpar busca"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {selectedExpansion !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <span>Expansão: {expansionName || selectedExpansion}</span>
            <button
              onClick={onClearExpansion}
              className="p-0.5 hover:text-white rounded transition-colors"
              aria-label="Remover filtro de expansão"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {selectedVariant !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <span>Variante: {selectedVariant}</span>
            <button
              onClick={onClearVariant}
              className="p-0.5 hover:text-white rounded transition-colors"
              aria-label="Remover filtro de variante"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filterDuplicatesOnly && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <span>Apenas Duplicadas (&gt;1)</span>
            <button
              onClick={onToggleDuplicates}
              className="p-0.5 hover:text-white rounded transition-colors"
              aria-label="Remover filtro de duplicadas"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 ml-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar filtros</span>
          </button>
        )}
      </div>

      {/* Result Counter */}
      <div className="text-xs font-mono text-slate-400">
        <span className="font-bold text-white">{totalFiltered}</span> de{' '}
        <span>{totalTotal} cartas</span>
      </div>
    </div>
  );
};
