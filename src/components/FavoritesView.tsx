import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { CardLanguage, PokemonCard } from '../types';
import { CardImage } from './CardImage';

interface FavoritesViewProps {
  preferredLanguage: CardLanguage;
  onSelectCard: (card: PokemonCard) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  preferredLanguage,
  onSelectCard,
}) => {
  const [favoriteCards, setFavoriteCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      setLoading(true);
      const favIds = StorageService.getFavorites();
      if (favIds.length > 0) {
        const metadata = await CardProvider.getCardsByIds(favIds, preferredLanguage);
        setFavoriteCards(Object.values(metadata));
      } else {
        setFavoriteCards([]);
      }
      setLoading(false);
    }

    loadFavorites();
  }, [preferredLanguage]);

  return (
    <div className="space-y-6 pb-16">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-500 fill-current" />
          Minhas Cartas Favoritas
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Cartas marcadas com o ícone de coração
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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
      ) : favoriteCards.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs">
          Nenhuma carta favoritada. Clique no ícone de coração em qualquer carta para adicioná-la aqui!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {favoriteCards.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelectCard(card)}
              className="group relative bg-slate-900 border border-slate-800 hover:border-rose-500 rounded-2xl p-2.5 cursor-pointer transition-all shadow-lg"
            >
              <div className="aspect-[3/4] w-full mb-2">
                <CardImage src={card.image} alt={card.name} rarity={card.rarity} card={card} />
              </div>
              <div className="text-xs font-bold text-slate-100 truncate group-hover:text-rose-400">
                {card.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">{card.setName}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
