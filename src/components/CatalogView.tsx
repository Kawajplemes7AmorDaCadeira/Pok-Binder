import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Filter,
  Heart,
  Layers,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { CardLanguage, CardSet, CatalogFilterOptions, PokemonCard } from '../types';
import { CardImage } from './CardImage';
import { VirtualizedGrid } from './VirtualizedGrid';

interface CatalogViewProps {
  preferredLanguage: CardLanguage;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectCard: (card: PokemonCard) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  preferredLanguage,
  searchQuery,
  setSearchQuery,
  onSelectCard,
}) => {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters State
  const [selectedSet, setSelectedSet] = useState<string>('sv03.5'); // Default to Pokémon 151
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedRarity, setSelectedRarity] = useState<string>('');
  const [selectedArtist, setSelectedArtist] = useState<string>('');
  const [filterOwnedOnly, setFilterOwnedOnly] = useState(false);
  const [filterUnownedOnly, setFilterUnownedOnly] = useState(false);
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 120;

  useEffect(() => {
    async function loadSets() {
      const availableSets = await CardProvider.getSets(preferredLanguage);
      setSets(availableSets);
    }
    loadSets();
  }, [preferredLanguage]);

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      const options: CatalogFilterOptions = {
        searchQuery,
        setId: selectedSet || undefined,
        type: selectedType || undefined,
        rarity: selectedRarity || undefined,
        artist: selectedArtist || undefined,
      };

      const result = await CardProvider.searchCards(options, preferredLanguage);
      let filtered = result.cards;

      // Filter owned/unowned / favorites in local storage state
      const collection = StorageService.getCollection();
      const ownedCardIds = new Set(collection.map((i) => i.cardId));
      const favoriteCardIds = new Set(StorageService.getFavorites());

      if (filterOwnedOnly) {
        filtered = filtered.filter((c) => ownedCardIds.has(c.id));
      }
      if (filterUnownedOnly) {
        filtered = filtered.filter((c) => !ownedCardIds.has(c.id));
      }
      if (filterFavoritesOnly) {
        filtered = filtered.filter((c) => favoriteCardIds.has(c.id));
      }

      setCards(filtered);
      setCurrentPage(1);
      setLoading(false);
    }

    loadCards();
  }, [
    searchQuery,
    selectedSet,
    selectedType,
    selectedRarity,
    selectedArtist,
    filterOwnedOnly,
    filterUnownedOnly,
    filterFavoritesOnly,
    preferredLanguage,
  ]);

  const resetFilters = () => {
    setSelectedSet('');
    setSelectedType('');
    setSelectedRarity('');
    setSelectedArtist('');
    setFilterOwnedOnly(false);
    setFilterUnownedOnly(false);
    setFilterFavoritesOnly(false);
    setSearchQuery('');
  };

  // Pagination logic
  const totalPages = Math.ceil(cards.length / cardsPerPage);
  const paginatedCards = cards.slice((currentPage - 1) * cardsPerPage, currentPage * cardsPerPage);

  const pokemonTypes = [
    'Colorless',
    'Darkness',
    'Dragon',
    'Fairy',
    'Fighting',
    'Fire',
    'Grass',
    'Lightning',
    'Metal',
    'Psychic',
    'Water',
  ];

  const rarities = [
    'Common',
    'Uncommon',
    'Rare',
    'Double Rare',
    'Illustration Rare',
    'Special Illustration Rare',
    'Ultra Rare',
    'Hyper Rare',
    'Promo',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Search Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Main Search Field */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, número (ex: 25/165, 025), artista, código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                showFilters || selectedType || selectedRarity || filterOwnedOnly
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filtros</span>
            </button>

            <button
              onClick={resetFilters}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Limpar Filtros"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Set Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedSet('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              !selectedSet ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Todas Expansões
          </button>
          {sets.slice(0, 15).map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSet(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedSet === s.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* Expanded Filters Drawer */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl mt-2">
                {/* Type Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Tipo de Pokémon</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  >
                    <option value="">Todos os Tipos</option>
                    {pokemonTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rarity Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Raridade</label>
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  >
                    <option value="">Todas as Raridades</option>
                    {rarities.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Owned Toggles */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Status na Coleção</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setFilterOwnedOnly(!filterOwnedOnly);
                        if (!filterOwnedOnly) setFilterUnownedOnly(false);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                        filterOwnedOnly
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Já tenho
                    </button>
                    <button
                      onClick={() => {
                        setFilterUnownedOnly(!filterUnownedOnly);
                        if (!filterUnownedOnly) setFilterOwnedOnly(false);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                        filterUnownedOnly
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      Faltando
                    </button>
                  </div>
                </div>

                {/* Favorites Toggle */}
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Favoritas</label>
                  <button
                    onClick={() => setFilterFavoritesOnly(!filterFavoritesOnly)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition-colors ${
                      filterFavoritesOnly
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span>Apenas Favoritas</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Catalog Results Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Exibindo {cards.length} cartas encontradas
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-slate-400 font-mono">
              Página {currentPage} de {totalPages}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="relative aspect-[3/4] bg-slate-950 flex flex-col justify-between p-3 overflow-hidden rounded-2xl select-none border border-slate-800">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer pointer-events-none" />
                <div className="flex justify-between items-center">
                  <div className="h-2.5 w-12 bg-slate-800 rounded animate-pulse" />
                  <div className="h-2 w-4 bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="w-full flex-1 my-2 bg-slate-800/50 rounded-lg animate-pulse flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-slate-700 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-800 rounded animate-pulse" />
                  <div className="h-1.5 w-2/3 bg-slate-800/40 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Search className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhuma carta encontrada</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente buscar com outro nome, número ou limpe os filtros selecionados.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <VirtualizedGrid<PokemonCard>
            items={paginatedCards}
            keyExtractor={(card) => card.id}
            gap={16}
            renderItem={(card) => {
              const totalOwned = StorageService.getCardTotalQuantity(card.id);
              const isFav = StorageService.isFavorite(card.id);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onSelectCard(card)}
                  className="group relative bg-slate-900 border border-slate-800 hover:border-red-500/80 rounded-2xl p-2.5 cursor-pointer transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between h-full"
                >
                  {/* Owned Quantity & Favorite Badges */}
                  <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                    {totalOwned > 0 ? (
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow border border-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> x{totalOwned}
                      </span>
                    ) : (
                      <span className="bg-slate-950/80 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur border border-slate-800">
                        {card.localId}
                      </span>
                    )}

                    {isFav && (
                      <span className="bg-rose-600 text-white p-1 rounded-full shadow">
                        <Heart className="w-3 h-3 fill-white" />
                      </span>
                    )}
                  </div>

                  {/* Card Art */}
                  <div className="aspect-[3/4] w-full mb-2">
                    <CardImage src={card.image} alt={card.name} rarity={card.rarity} card={card} showZoomHint />
                  </div>

                  {/* Info Footer */}
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-slate-100 group-hover:text-red-400 truncate">
                      {card.name}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="truncate max-w-[90px]">{card.setName}</span>
                      <span className="font-bold text-amber-400">{card.localId}</span>
                    </div>
                  </div>
                </motion.div>
              );
            }}
          />
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-xs font-mono font-bold text-white bg-slate-950 rounded-xl border border-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
