import React, { useEffect, useState, useMemo } from 'react';
import { Bookmark, Check, DollarSign, Heart, Plus, Search, Sparkles, Trophy } from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { PriceService } from '../services/pricing/PriceService';
import { CardLanguage, CardSet, PokemonCard } from '../types';
import { CardImage } from './CardImage';

interface MissingViewProps {
  preferredLanguage: CardLanguage;
  onSelectCard: (card: PokemonCard) => void;
}

export const MissingView: React.FC<MissingViewProps> = ({
  preferredLanguage,
  onSelectCard,
}) => {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('sv03.5');
  const [missingCards, setMissingCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'price_desc' | 'price_asc'>('number');
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
    async function loadMissing() {
      if (!selectedSetId) return;
      setLoading(true);

      const allCards = await CardProvider.getCardsBySet(selectedSetId, preferredLanguage);
      const collection = StorageService.getCollection();
      const ownedIds = new Set(collection.map((i) => i.cardId));

      const missing = allCards.filter((c) => !ownedIds.has(c.id));
      setMissingCards(missing);
      setLoading(false);
    }

    loadMissing();
  }, [selectedSetId, preferredLanguage]);

  // Compute estimated cost to buy all missing cards
  const estimatedCost = useMemo(() => {
    return missingCards.reduce((sum, card) => {
      return sum + PriceService.getCardMarketPrice(card, 'normal');
    }, 0);
  }, [missingCards]);

  // Filtered and sorted cards
  const displayedCards = useMemo(() => {
    let list = missingCards.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.localId?.includes(searchQuery)
    );

    if (sortBy === 'price_desc') {
      list.sort((a, b) => PriceService.getCardMarketPrice(b, 'normal') - PriceService.getCardMarketPrice(a, 'normal'));
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => PriceService.getCardMarketPrice(a, 'normal') - PriceService.getCardMarketPrice(b, 'normal'));
    }

    return list;
  }, [missingCards, searchQuery, sortBy]);

  const handleQuickAdd = (e: React.MouseEvent, card: PokemonCard) => {
    e.stopPropagation();
    StorageService.updateCardQuantity(card.id, 1, 'normal', preferredLanguage);
    setMissingCards((prev) => prev.filter((c) => c.id !== card.id));
    showToast(`+1 ${card.name} adicionado à coleção! 📦`);
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

      {/* Header & Controls */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Search className="w-6 h-6 text-red-500" />
              Cartas Faltantes por Expansão
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualize o que falta para completar cada coleção com cotação de mercado em BRL.
            </p>
          </div>

          {/* Select Set */}
          <div className="w-full md:w-auto">
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="w-full bg-[#080f21] border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-red-500"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || s.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats and Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#080f21] p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">Total Faltante</div>
              <div className="text-base font-mono font-black text-red-400">
                {missingCards.length} cartas
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">Estimativa para Completar</div>
              <div className="text-base font-mono font-black text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  estimatedCost
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por nome ou #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0 font-bold">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none"
            >
              <option value="number">Número do Set (#)</option>
              <option value="price_desc">Preço: Maior primeiro</option>
              <option value="price_asc">Preço: Menor primeiro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Missing Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : displayedCards.length === 0 ? (
        <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-12 text-center text-emerald-400 font-bold text-sm space-y-2">
          <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
          <div>🎉 Incrível! Você não tem cartas faltantes correspondentes neste filtro!</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayedCards.map((card) => {
            const price = PriceService.getCardMarketPrice(card, 'normal');

            return (
              <div
                key={card.id}
                onClick={() => onSelectCard(card)}
                className="bg-[#0b1329]/90 border border-slate-800/80 hover:border-red-500/50 rounded-2xl p-2.5 cursor-pointer transition-all flex flex-col justify-between group shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono">
                  <span className="text-slate-400 font-bold">#{card.localId}</span>
                  <span className="text-emerald-400 font-black">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      price
                    )}
                  </span>
                </div>

                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
                  <CardImage
                    src={card.image}
                    alt={card.name}
                    rarity={card.rarity}
                    card={card}
                    className="w-full h-full opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-200 truncate group-hover:text-red-400 transition-colors">
                    {card.name}
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      onClick={(e) => handleQuickAdd(e, card)}
                      title="Adicionar 1 cópia à coleção"
                      className="flex-1 py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Tenho
                    </button>
                    <button
                      onClick={(e) => handleQuickWishlist(e, card)}
                      title="Adicionar à Wishlist"
                      className="p-1 rounded-lg bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white transition-colors"
                    >
                      <Heart className="w-3.5 h-3.5" />
                    </button>
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
