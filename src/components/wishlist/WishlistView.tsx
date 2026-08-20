import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  DollarSign,
  Heart,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { CardLanguage, CardVariant, PokemonCard, WishlistItem } from '../../types';
import { StorageService } from '../../services/storage';
import { CardProvider } from '../../services/cardProvider';
import { PriceService } from '../../services/pricing/PriceService';

interface WishlistViewProps {
  preferredLanguage: CardLanguage;
  onSelectCard: (card: PokemonCard, variant?: CardVariant) => void;
  onNavigateToCatalog: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  preferredLanguage,
  onSelectCard,
  onNavigateToCatalog,
}) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [cardMap, setCardMap] = useState<Record<string, PokemonCard>>({});
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadWishlist = async () => {
    setLoading(true);
    const items = StorageService.getWishlist();
    setWishlist(items);

    const ids = Array.from(new Set(items.map((i) => i.cardId)));
    if (ids.length > 0) {
      const cards = await CardProvider.getCardsByIds(ids, preferredLanguage);
      setCardMap(cards);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWishlist();
  }, [preferredLanguage]);

  const handleRemove = (cardId: string, variant: CardVariant) => {
    StorageService.removeFromWishlist(cardId, variant);
    loadWishlist();
    showToast('Carta removida da Wishlist.');
  };

  const handleMoveToCollection = (cardId: string, variant: CardVariant) => {
    StorageService.updateCardQuantity(cardId, 1, variant);
    StorageService.removeFromWishlist(cardId, variant);
    loadWishlist();
    showToast('Carta adicionada à sua Coleção! 🎉');
  };

  const handleUpdateTargetPrice = (cardId: string, variant: CardVariant, newTarget: number) => {
    StorageService.updateWishlistItem(cardId, variant, { targetPrice: newTarget });
    loadWishlist();
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-7 pb-20 max-w-[1540px] mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 border border-pink-500/40 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-pink-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 flex items-center justify-center text-pink-500 shadow-md shadow-pink-500/10 shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                  Lista de Desejos (Wishlist)
                </h1>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-pink-950/60 border border-pink-500/40 text-pink-300">
                  {wishlist.length} cartas desejadas
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Acompanhe o preço alvo de compra para suas cartas dos sonhos e receba alertas de oportunidade.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToCatalog}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white text-xs font-bold transition-all shadow-lg shadow-pink-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar do Catálogo</span>
          </button>
        </div>
      </div>

      {/* 2. Cards Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-xs">Carregando wishlist...</div>
      ) : wishlist.length === 0 ? (
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-12 text-center shadow-xl">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-500 flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">Sua Wishlist está vazia</h3>
            <p className="text-xs text-slate-400">
              Navegue pelo catálogo ou pelo fichário digital e clique no botão "+ Wishlist" nas cartas que deseja comprar no futuro.
            </p>
            <button
              onClick={onNavigateToCatalog}
              className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-colors"
            >
              Explorar Catálogo de Cartas
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {wishlist.map((item) => {
            const card = cardMap[item.cardId];
            const currentPrice = PriceService.getCardMarketPrice(card, item.variant);
            const targetPrice = item.targetPrice || currentPrice * 0.85;
            const isGoodDeal = currentPrice <= targetPrice;

            return (
              <div
                key={`${item.cardId}-${item.variant}`}
                className="bg-[#091124] border border-slate-800/90 hover:border-pink-500/50 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all"
              >
                <div className="flex gap-3">
                  <div
                    onClick={() => card && onSelectCard(card, item.variant)}
                    className="w-16 h-22 bg-slate-950 rounded-xl overflow-hidden border border-slate-700/60 shrink-0 cursor-pointer"
                  >
                    {card?.image ? (
                      <img src={card.image} alt={card.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">?</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        onClick={() => card && onSelectCard(card, item.variant)}
                        className="text-xs font-bold text-white hover:text-pink-400 cursor-pointer truncate"
                      >
                        {card?.name || item.cardId}
                      </h4>
                      <button
                        onClick={() => handleRemove(item.cardId, item.variant)}
                        className="text-slate-600 hover:text-rose-400 p-0.5"
                        title="Remover da Wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[10px] font-mono text-slate-400">
                      <span>{card?.setName || 'Set'}</span> • <span className="uppercase text-amber-400">{item.variant}</span>
                    </div>

                    {isGoodDeal && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300">
                        <Sparkles className="w-2.5 h-2.5" /> Abaixo do Alvo!
                      </span>
                    )}
                  </div>
                </div>

                {/* Price Matrix */}
                <div className="bg-[#060c1c] p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-sans">Preço Atual:</span>
                    <span className="font-bold text-white">{formatBRL(currentPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-sans">Preço Alvo:</span>
                    <span className="font-bold text-pink-400">{formatBRL(targetPrice)}</span>
                  </div>
                </div>

                {/* Action: Move to Collection */}
                <button
                  onClick={() => handleMoveToCollection(item.cardId, item.variant)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 hover:border-emerald-500 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Comprei / Adicionar à Coleção</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
