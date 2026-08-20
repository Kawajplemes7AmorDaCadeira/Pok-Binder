import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  FolderHeart,
  Grid,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { PriceService } from '../services/pricing/PriceService';
import { CardLanguage, CardVariant, CollectionItem, PokemonCard } from '../types';
import { TCGCollectionCard } from './tcg/TCGCollectionCard';
import { TCGListRow } from './tcg/TCGListRow';
import { FilterChips } from './tcg/FilterChips';

interface MyCollectionProps {
  preferredLanguage: CardLanguage;
  collectionVersion?: number;
  onSelectCard: (card: PokemonCard, variant?: CardVariant) => void;
  onNavigateToCatalog: () => void;
}

type ViewMode = 'grid' | 'compact' | 'list';
type SortOption =
  | 'recent'
  | 'name-asc'
  | 'name-desc'
  | 'quantity-desc'
  | 'quantity-asc'
  | 'price-desc'
  | 'price-asc';

export const MyCollection: React.FC<MyCollectionProps> = ({
  preferredLanguage,
  collectionVersion,
  onSelectCard,
  onNavigateToCatalog,
}) => {
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [cardMap, setCardMap] = useState<Record<string, PokemonCard>>({});
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedExpansion, setSelectedExpansion] = useState<string>('all');
  const [selectedVariantFilter, setSelectedVariantFilter] = useState<string>('all');
  const [filterDuplicatesOnly, setFilterDuplicatesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const reloadCollection = async () => {
    setLoading(true);
    const items = StorageService.getCollection();
    setCollectionItems(items);

    const uniqueCardIds = Array.from(new Set(items.map((i) => i.cardId)));
    if (uniqueCardIds.length > 0) {
      const metadata = await CardProvider.getCardsByIds(uniqueCardIds, preferredLanguage);
      setCardMap(metadata);
    }
    setLoading(false);
  };

  useEffect(() => {
    reloadCollection();
  }, [preferredLanguage, collectionVersion]);

  const handleExportJSON = () => {
    setShowExportMenu(false);
    const json = StorageService.exportFullBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokebinder_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Backup JSON exportado com sucesso! 📄');
  };

  const handleExportCSV = () => {
    setShowExportMenu(false);
    const csv = StorageService.exportCollectionCSV(cardMap);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokebinder_colecao_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Planilha CSV gerada com sucesso! 📊');
  };

  const handleVariantChange = (cardId: string, oldVariant: CardVariant, newVariant: CardVariant) => {
    StorageService.convertCardVariant(cardId, oldVariant, newVariant);
    reloadCollection();
    showToast(`Variante atualizada para ${newVariant.toUpperCase()} ✨`);
  };

  const handleQuantityChange = (cardId: string, variant: CardVariant, newQty: number) => {
    const item = collectionItems.find((i) => i.cardId === cardId && i.variant === variant);
    if (item) {
      const delta = newQty - item.quantity;
      if (delta !== 0) {
        StorageService.updateCardQuantity(cardId, delta, variant, preferredLanguage, item.condition);
        reloadCollection();
        showToast(`Quantidade ajustada para x${newQty}`);
      }
    }
  };

  // Extract unique expansions for filter
  const availableExpansions = useMemo(() => {
    const sets = new Map<string, string>();
    collectionItems.forEach((item) => {
      const c = cardMap[item.cardId];
      if (c && c.setId) {
        sets.set(c.setId, c.setName || c.setId);
      }
    });
    return Array.from(sets.entries()).map(([id, name]) => ({ id, name }));
  }, [collectionItems, cardMap]);

  // Calculations for Stats
  const uniqueCardsCount = useMemo(() => {
    return new Set(collectionItems.map((i) => i.cardId)).size;
  }, [collectionItems]);

  const totalCopiesCount = useMemo(() => {
    return collectionItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [collectionItems]);

  const duplicatesCount = useMemo(() => {
    return collectionItems.reduce((sum, item) => sum + (item.quantity > 1 ? item.quantity - 1 : 0), 0);
  }, [collectionItems]);

  const estimatedTotalValue = useMemo(() => {
    return collectionItems.reduce((sum, item) => {
      const c = cardMap[item.cardId];
      const price = PriceService.getCardMarketPrice(c, item.variant) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [collectionItems, cardMap]);

  // Top 3 Sets Progress
  const topSetsProgress = useMemo(() => {
    const setCounts = new Map<string, { name: string; count: number; total: number }>();

    collectionItems.forEach((item) => {
      const card = cardMap[item.cardId];
      if (card && card.setId) {
        const existing = setCounts.get(card.setId) || {
          name: card.setName || card.setId,
          count: 0,
          total: card.setTotalCards || 100,
        };
        existing.count += 1;
        setCounts.set(card.setId, existing);
      }
    });

    return Array.from(setCounts.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        owned: data.count,
        total: data.total,
        percentage: Math.min(100, Math.round((data.count / data.total) * 100)),
      }))
      .sort((a, b) => b.owned - a.owned)
      .slice(0, 3);
  }, [collectionItems, cardMap]);

  // Filtered & Sorted items
  const filteredAndSortedItems = useMemo(() => {
    return collectionItems
      .filter((item) => {
        const card = cardMap[item.cardId];
        if (searchFilter) {
          const q = searchFilter.toLowerCase();
          const matches =
            item.cardId.toLowerCase().includes(q) ||
            (card && card.name.toLowerCase().includes(q)) ||
            (card && card.setName.toLowerCase().includes(q)) ||
            (card && card.localId.toLowerCase().includes(q));
          if (!matches) return false;
        }

        if (selectedExpansion !== 'all') {
          if (!card || card.setId !== selectedExpansion) return false;
        }

        if (selectedVariantFilter !== 'all') {
          if (item.variant !== selectedVariantFilter) return false;
        }

        if (filterDuplicatesOnly) {
          if (item.quantity <= 1) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const cardA = cardMap[a.cardId];
        const cardB = cardMap[b.cardId];

        const priceA = PriceService.getCardMarketPrice(cardA, a.variant) || 0;
        const priceB = PriceService.getCardMarketPrice(cardB, b.variant) || 0;

        switch (sortBy) {
          case 'name-asc':
            return (cardA?.name || a.cardId).localeCompare(cardB?.name || b.cardId);
          case 'name-desc':
            return (cardB?.name || b.cardId).localeCompare(cardA?.name || a.cardId);
          case 'quantity-desc':
            return b.quantity - a.quantity;
          case 'quantity-asc':
            return a.quantity - b.quantity;
          case 'price-desc':
            return priceB - priceA;
          case 'price-asc':
            return priceA - priceB;
          case 'recent':
          default:
            return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        }
      });
  }, [collectionItems, cardMap, searchFilter, selectedExpansion, selectedVariantFilter, filterDuplicatesOnly, sortBy]);

  const selectedExpansionName = availableExpansions.find((e) => e.id === selectedExpansion)?.name;

  return (
    <div className="space-y-6 pb-20 max-w-[1540px] mx-auto relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 bg-slate-900/95 border border-red-500/40 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header Bar */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Left Title & Subtitle */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-md shadow-red-500/10 shrink-0">
              <FolderHeart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                  Minha Coleção
                </h1>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-300">
                  {uniqueCardsCount} únicas • {totalCopiesCount} cópias
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Fichário digital com controle de variantes, cópias físicas e valorização de mercado.
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/90 text-slate-200 text-xs font-bold transition-all hover:text-white"
                title="Exportar dados da coleção"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Exportar</span>
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={handleExportCSV}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Planilha CSV</span>
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>Backup JSON</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Primary Add Button */}
            <button
              onClick={onNavigateToCatalog}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Cartas</span>
            </button>
          </div>
        </div>

        {/* 2. Interactive Stat Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          {/* Stat 1: Cartas Únicas */}
          <button
            onClick={() => {
              setFilterDuplicatesOnly(false);
              setSelectedExpansion('all');
              setSelectedVariantFilter('all');
              setSearchFilter('');
            }}
            className="bg-[#080f21] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 group focus:outline-none"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-red-400 transition-colors">
                Cartas Únicas
              </span>
              <BookOpen className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {uniqueCardsCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">modelos catalogados</div>
          </button>

          {/* Stat 2: Total de Cópias */}
          <button
            onClick={() => setSortBy('quantity-desc')}
            className="bg-[#080f21] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 group focus:outline-none"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-amber-400 transition-colors">
                Total de Cópias
              </span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {totalCopiesCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">unidades físicas no fichário</div>
          </button>

          {/* Stat 3: Valor Estimado */}
          <button
            onClick={() => setSortBy('price-desc')}
            className="bg-[#080f21] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 group focus:outline-none"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                Valor Estimado
              </span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                estimatedTotalValue
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-500/80 mt-0.5 font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>Cotação de mercado em BRL</span>
            </div>
          </button>

          {/* Stat 4: Duplicadas */}
          <button
            onClick={() => setFilterDuplicatesOnly(!filterDuplicatesOnly)}
            className={`rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 group focus:outline-none border ${
              filterDuplicatesOnly
                ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30'
                : 'bg-[#080f21] border-slate-800/80 hover:border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                Duplicadas
              </span>
              <Copy className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">
              {duplicatesCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {filterDuplicatesOnly ? 'Filtro ativo (clique para sair)' : 'Disponíveis para troca/venda'}
            </div>
          </button>
        </div>

        {/* 3. Top 3 Sets Progress Widget (Optional compact overview) */}
        {topSetsProgress.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800/60">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5 flex items-center justify-between">
              <span>Progresso por Expansão</span>
              <span className="text-slate-500 font-normal">Top coleções com cartas cadastradas</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topSetsProgress.map((set) => (
                <div
                  key={set.id}
                  onClick={() => setSelectedExpansion(set.id)}
                  className="bg-[#080f21] hover:bg-[#0c1630] border border-slate-800/80 rounded-xl p-3 cursor-pointer transition-all hover:border-slate-700 group"
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-200 group-hover:text-red-400 truncate">{set.name}</span>
                    {set.percentage >= 80 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded">
                        Quase completa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                    <span>
                      {set.owned} / {set.total} cartas
                    </span>
                    <span className="font-bold text-slate-300">{set.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, set.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Search & Filter Bar + View Mode Toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome da carta, número (#001), expansão..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-[#080f21] border border-slate-800/90 hover:border-slate-700 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Expansions + Variants + Sort + View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Expansion Select */}
            <select
              value={selectedExpansion}
              onChange={(e) => setSelectedExpansion(e.target.value)}
              className="bg-[#080f21] border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none cursor-pointer transition-all max-w-[170px] truncate"
            >
              <option value="all">Todas as Expansões</option>
              {availableExpansions.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name}
                </option>
              ))}
            </select>

            {/* Variant Select */}
            <select
              value={selectedVariantFilter}
              onChange={(e) => setSelectedVariantFilter(e.target.value)}
              className="bg-[#080f21] border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none cursor-pointer transition-all"
            >
              <option value="all">Todas Variantes</option>
              <option value="normal">⚪ Normal</option>
              <option value="holo">✨ Holo Foil</option>
              <option value="reverse">🌟 Reversa</option>
              <option value="cosmosHolo">🌌 Cosmos</option>
              <option value="promo">⭐ Promo</option>
            </select>

            {/* Sort Select */}
            <div className="flex items-center bg-[#080f21] border border-slate-800 rounded-xl px-2.5 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-slate-300 text-xs font-semibold outline-none cursor-pointer py-1.5"
              >
                <option value="recent">Mais Recentes</option>
                <option value="name-asc">Nome (A-Z)</option>
                <option value="name-desc">Nome (Z-A)</option>
                <option value="quantity-desc">Maior Quantidade</option>
                <option value="quantity-asc">Menor Quantidade</option>
                <option value="price-desc">Maior Valor (R$)</option>
                <option value="price-asc">Menor Valor (R$)</option>
              </select>
            </div>

            {/* View Mode Switcher: Grid / Compact / List */}
            <div className="flex items-center bg-[#080f21] border border-slate-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'grid'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title="Grade Normal"
                aria-label="Grade Normal"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'compact'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title="Grade Compacta"
                aria-label="Grade Compacta"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'list'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title="Modo Lista"
                aria-label="Modo Lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 5. Filter Chips Row */}
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <FilterChips
            searchQuery={searchFilter}
            onClearSearch={() => setSearchFilter('')}
            selectedExpansion={selectedExpansion}
            expansionName={selectedExpansionName}
            onClearExpansion={() => setSelectedExpansion('all')}
            selectedVariant={selectedVariantFilter}
            onClearVariant={() => setSelectedVariantFilter('all')}
            filterDuplicatesOnly={filterDuplicatesOnly}
            onToggleDuplicates={() => setFilterDuplicatesOnly(!filterDuplicatesOnly)}
            onClearAll={() => {
              setSearchFilter('');
              setSelectedExpansion('all');
              setSelectedVariantFilter('all');
              setFilterDuplicatesOnly(false);
            }}
            totalFiltered={filteredAndSortedItems.length}
            totalTotal={collectionItems.length}
          />
        </div>
      </div>

      {/* 6. Content Section: Loading / Empty State / Rendered Views */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="relative aspect-[3/4] bg-[#091124] flex flex-col justify-between p-3.5 overflow-hidden rounded-2xl select-none border border-slate-800/80 shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent animate-shimmer pointer-events-none" />
              <div className="flex justify-between items-center">
                <div className="h-4 w-12 bg-slate-800/80 rounded-full animate-pulse" />
                <div className="h-4 w-16 bg-slate-800/80 rounded-md animate-pulse" />
              </div>
              <div className="w-full flex-1 my-3 bg-slate-800/40 rounded-xl animate-pulse flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-slate-700 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-slate-800/80 rounded animate-pulse" />
                <div className="h-2 w-2/3 bg-slate-800/40 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedItems.length === 0 ? (
        /* Empty State with Compact Max-Width */
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-10 sm:p-14 text-center shadow-xl">
          <div className="max-w-[460px] mx-auto space-y-5">
            {/* Visual Preview Deck with subtle angle */}
            <div className="relative w-24 h-32 mx-auto mb-2 flex items-center justify-center">
              <div className="absolute w-20 h-28 bg-slate-800/60 border border-slate-700/60 rounded-xl -rotate-12 transform opacity-40 shadow-md pointer-events-none" />
              <div className="absolute w-20 h-28 bg-slate-800/60 border border-slate-700/60 rounded-xl rotate-12 transform opacity-40 shadow-md pointer-events-none" />
              <div className="relative w-22 h-30 bg-gradient-to-br from-red-500/20 via-[#0a1224] to-slate-900 border border-red-500/40 rounded-xl flex items-center justify-center text-red-500 shadow-xl shadow-red-500/10">
                <FolderHeart className="w-9 h-9" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {collectionItems.length === 0 ? 'Comece seu fichário' : 'Nenhuma carta encontrada'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {collectionItems.length === 0
                  ? 'Adicione suas primeiras cartas e acompanhe coleção, variantes e valores em um só lugar.'
                  : 'Nenhuma carta na sua coleção corresponde aos filtros e termos de busca selecionados.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {collectionItems.length === 0 ? (
                <>
                  <button
                    onClick={onNavigateToCatalog}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Carta
                  </button>
                  <button
                    onClick={onNavigateToCatalog}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
                  >
                    Explorar Catálogo
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSearchFilter('');
                    setSelectedExpansion('all');
                    setSelectedVariantFilter('all');
                    setFilterDuplicatesOnly(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* List Mode */
        <div className="space-y-2">
          {filteredAndSortedItems.map((item) => (
            <TCGListRow
              key={item.id}
              item={item}
              card={cardMap[item.cardId]}
              onSelect={() => cardMap[item.cardId] && onSelectCard(cardMap[item.cardId], item.variant)}
              onVariantChange={(newVar) => handleVariantChange(item.cardId, item.variant, newVar)}
              onQuantityChange={(newQty) => handleQuantityChange(item.cardId, item.variant, newQty)}
              onToast={showToast}
            />
          ))}
        </div>
      ) : (
        /* Grid and Compact Grid Mode */
        <div
          className={`grid gap-3.5 sm:gap-4 ${
            viewMode === 'compact'
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
          }`}
        >
          {filteredAndSortedItems.map((item) => (
            <TCGCollectionCard
              key={item.id}
              item={item}
              card={cardMap[item.cardId]}
              isCompact={viewMode === 'compact'}
              onSelect={() => cardMap[item.cardId] && onSelectCard(cardMap[item.cardId], item.variant)}
              onVariantChange={(newVar) => handleVariantChange(item.cardId, item.variant, newVar)}
              onToast={showToast}
            />
          ))}
        </div>
      )}
    </div>
  );
};
