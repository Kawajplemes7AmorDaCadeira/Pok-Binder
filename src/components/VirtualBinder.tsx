import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Heart,
  Layers,
  Plus,
  Sparkles,
  Zap,
} from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { PriceService } from '../services/pricing/PriceService';
import { CardLanguage, CardSet, CardVariant, PokemonCard } from '../types';
import { CardImage } from './CardImage';
import { PokeballSpinner } from './PokeballSpinner';

interface VirtualBinderProps {
  preferredLanguage: CardLanguage;
  initialSetId?: string;
  onSelectCard: (card: PokemonCard, variant?: CardVariant) => void;
}

export const VirtualBinder: React.FC<VirtualBinderProps> = ({
  preferredLanguage,
  initialSetId = 'sv03.5',
  onSelectCard,
}) => {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [currentSetId, setCurrentSetId] = useState<string>(initialSetId);
  const [currentSet, setCurrentSet] = useState<CardSet | null>(null);
  const [setCards, setSetCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  // Binder configuration
  const [pageSize, setPageSize] = useState<9 | 12>(9);
  const [masterSetMode, setMasterSetMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    async function loadSets() {
      const availableSets = await CardProvider.getSets(preferredLanguage);
      setSets(availableSets);
    }
    loadSets();
  }, [preferredLanguage]);

  useEffect(() => {
    async function loadBinderSet() {
      if (!currentSetId) return;
      setLoading(true);

      const setMeta = await CardProvider.getSetById(currentSetId, preferredLanguage);
      const cards = await CardProvider.getCardsBySet(currentSetId, preferredLanguage);

      setCurrentSet(setMeta);
      setSetCards(cards);
      setCurrentPage(1);
      setLoading(false);
    }

    loadBinderSet();
  }, [currentSetId, preferredLanguage]);

  // Collection tracking
  const collection = StorageService.getCollection();
  const ownedMap: Record<string, number> = {};
  collection.forEach((item) => {
    ownedMap[item.cardId] = (ownedMap[item.cardId] || 0) + item.quantity;
  });

  const totalCardsInBinder = setCards.length;
  const ownedUniqueInBinder = setCards.filter((c) => (ownedMap[c.id] || 0) > 0).length;
  const officialCount = currentSet?.cardCount?.official || 100;
  const completionPercentage =
    totalCardsInBinder > 0
      ? Math.min(100, Math.round((ownedUniqueInBinder / officialCount) * 1000) / 10)
      : 0;

  // Calculate missing cards and cost estimate
  const missingCards = setCards.filter((c) => !ownedMap[c.id]);
  const estimatedCostToComplete = missingCards.reduce((sum, c) => {
    return sum + PriceService.getCardMarketPrice(c, 'normal');
  }, 0);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(setCards.length / pageSize));
  const currentPageCards = setCards.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleQuickAdd = (e: React.MouseEvent, card: PokemonCard) => {
    e.stopPropagation();
    StorageService.updateCardQuantity(card.id, 1, 'normal', preferredLanguage);
    showToast(`+1 ${card.name} adicionado ao fichário! 📦`);
  };

  const handleQuickWishlist = (e: React.MouseEvent, card: PokemonCard) => {
    e.stopPropagation();
    const price = PriceService.getCardMarketPrice(card, 'normal');
    StorageService.addToWishlist({
      cardId: card.id,
      cardName: card.name,
      setName: card.setName,
      image: card.image,
      variant: 'normal',
      targetPrice: Number((price * 0.85).toFixed(2)),
      priority: 'media',
    });
    showToast(`${card.name} adicionado à Wishlist! ♥`);
  };

  return (
    <div className="space-y-6 pb-16 max-w-[1540px] mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 border border-amber-500/40 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Set Selector & Binder Header */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  {currentSet?.name || 'Fichário Digital'}
                </h1>
                <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-full">
                  {currentSet?.code || currentSetId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulador de fichário real com slots transparentes, indicador de faltantes e cotação para completar.
              </p>
            </div>
          </div>

          {/* Controls: Grid Size & Master Set & Set Picker */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Grid layout selector */}
            <div className="flex items-center bg-[#080f21] border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => {
                  setPageSize(9);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  pageSize === 9 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                3x3 (9)
              </button>
              <button
                onClick={() => {
                  setPageSize(12);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  pageSize === 12 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                4x3 (12)
              </button>
            </div>

            {/* Expansion Dropdown Picker */}
            <select
              value={currentSetId}
              onChange={(e) => setCurrentSetId(e.target.value)}
              className="bg-[#080f21] border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expansion Progress Bar & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#080f21] p-4 rounded-2xl border border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Progresso do Set</span>
              <span className="font-mono font-black text-amber-400 text-sm">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.max(2, completionPercentage)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-xs font-mono">
            <span className="text-slate-400 font-sans">Posse / Total:</span>
            <span className="text-white font-bold">
              {ownedUniqueInBinder} / {officialCount} cartas
            </span>
          </div>

          <div className="flex items-center justify-between px-2 text-xs font-mono">
            <span className="text-slate-400 font-sans">Custo estimado faltantes:</span>
            <span className="text-emerald-400 font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                estimatedCostToComplete
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Realistic Binder Container Frame with Tactile Synthetic Leather Texture */}
      <div
        className="relative border-[14px] border-[#070b16] shadow-2xl rounded-[32px] p-4 md:p-8 space-y-6 overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: '#070b16',
          backgroundImage: `
            linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(8, 12, 24, 0.98) 100%),
            url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")
          `,
        }}
      >
        {/* Stitched seam effect */}
        <div className="absolute inset-1.5 border border-dashed border-slate-700/40 rounded-[22px] pointer-events-none" />

        {/* Physical Metallic Binder Ring Accents */}
        <div className="hidden lg:flex absolute left-0 top-0 bottom-0 w-8 bg-slate-950/40 border-r border-slate-800/40 pointer-events-none flex-col justify-around py-16">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="relative w-8 h-12 flex items-center justify-center">
              <div className="absolute -left-1.5 w-11 h-11 border-4 border-slate-400 rounded-full bg-transparent shadow-[inset_-2px_2px_4px_rgba(255,255,255,0.4),2px_3px_6px_rgba(0,0,0,0.6)]" />
              <div className="absolute -left-1.5 w-11 h-11 border-4 border-slate-200 rounded-full bg-transparent opacity-40 blur-[0.5px]" />
            </div>
          ))}
        </div>

        {/* Binder Page Controls Header */}
        <div className="relative flex items-center justify-between bg-slate-900/90 p-3 rounded-2xl border border-slate-800 lg:ml-8 z-30">
          <button
            disabled={currentPage === 1}
            onClick={() => {
              setDirection('prev');
              setCurrentPage((p) => Math.max(1, p - 1));
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" /> Página Anterior
          </button>

          <div className="text-center">
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider block">
              Fichário TCG Oficial
            </span>
            <span className="text-xs font-mono font-bold text-slate-200">
              Página {currentPage} de {totalPages}
            </span>
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => {
              setDirection('next');
              setCurrentPage((p) => Math.min(totalPages, p + 1));
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            Próxima Página <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Pockets Grid Layout */}
        <div className="lg:pl-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="relative min-h-[400px] flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl p-8 bg-slate-950/40">
                <PokeballSpinner size="lg" />
              </div>
            ) : (
              <motion.div
                key={`binder-page-${currentPage}-${pageSize}`}
                initial={{
                  rotateY: direction === 'next' ? 30 : -30,
                  opacity: 0,
                  scale: 0.96,
                }}
                animate={{
                  rotateY: 0,
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  rotateY: direction === 'next' ? -30 : 30,
                  opacity: 0,
                  scale: 0.96,
                }}
                transition={{ duration: 0.35 }}
                className={`grid gap-4 sm:gap-6 p-2 ${
                  pageSize === 9
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                }`}
              >
                {currentPageCards.map((card) => {
                  const countOwned = ownedMap[card.id] || 0;
                  const isOwned = countOwned > 0;
                  const price = PriceService.getCardMarketPrice(card, 'normal');

                  return (
                    <div
                      key={card.id}
                      onClick={() => onSelectCard(card)}
                      className={`relative aspect-[3/4] rounded-2xl p-3 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between group shadow-xl ${
                        isOwned
                          ? 'bg-slate-900/90 border-slate-700 hover:border-amber-500 shadow-slate-950/80 hover:shadow-2xl'
                          : 'bg-[#080d1c]/90 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Pocket Header */}
                      <div className="flex items-center justify-between mb-1.5 z-20">
                        <span
                          className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border ${
                            card.isSecret
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-slate-950 text-slate-300 border-slate-800'
                          }`}
                        >
                          #{card.localId}
                        </span>

                        {isOwned ? (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1 border border-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> x{countOwned}
                          </span>
                        ) : (
                          <span className="bg-slate-950 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-800">
                            Faltante
                          </span>
                        )}
                      </div>

                      {/* Card Art / Silhouette */}
                      <div className="flex-1 relative overflow-hidden rounded-xl z-20 flex items-center justify-center">
                        {isOwned ? (
                          <CardImage
                            src={card.image}
                            alt={card.name}
                            rarity={card.rarity}
                            card={card}
                            className="w-full h-full"
                            showZoomHint
                          />
                        ) : (
                          <div className="w-full h-full bg-[#050914] border border-slate-800/80 rounded-xl flex flex-col items-center justify-center p-3 text-center space-y-2 group-hover:border-slate-700 transition-colors">
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-base font-black font-mono">
                              #{card.localId}
                            </div>
                            <span className="text-xs font-bold text-slate-400 truncate max-w-full">
                              {card.name}
                            </span>
                            <span className="text-[10px] text-emerald-400/80 font-mono">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
                            </span>

                            {/* Missing Actions: Quick Add or Wishlist */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                onClick={(e) => handleQuickAdd(e, card)}
                                title="Adicionar 1 cópia à coleção"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleQuickWishlist(e, card)}
                                title="Adicionar à Wishlist"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white transition-colors"
                              >
                                <Heart className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pocket Bottom Label */}
                      <div className="mt-2 text-center z-20">
                        <span className="text-xs font-bold text-slate-200 block truncate group-hover:text-amber-400 transition-colors">
                          {card.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block font-mono">
                          {card.rarity || 'Comum'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Binder Bottom Jump Page Nav */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 pt-3 lg:ml-8 z-30">
          <div className="text-xs font-semibold text-slate-400">
            Mostrando {currentPageCards.length} de {setCards.length} cartas neste fichário
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Ir para página:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const p = parseInt(e.target.value, 10);
                if (p >= 1 && p <= totalPages) setCurrentPage(p);
              }}
              className="w-14 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-center font-mono font-bold text-xs text-white"
            />
            <span className="text-xs font-mono text-slate-400">/ {totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
