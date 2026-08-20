import React from 'react';
import { Heart, Minus, Plus } from 'lucide-react';
import { CardVariant, CollectionItem, PokemonCard } from '../../types';
import { getRarityDisplay, getVariantBadgeStyle } from './TCGCollectionCard';
import { StorageService } from '../../services/storage';
import { PriceService } from '../../services/pricing/PriceService';

interface TCGListRowProps {
  item: CollectionItem;
  card?: PokemonCard;
  onSelect: () => void;
  onVariantChange: (newVariant: CardVariant) => void;
  onQuantityChange: (newQty: number) => void;
  onToast?: (msg: string) => void;
}

export const TCGListRow: React.FC<TCGListRowProps> = ({
  item,
  card,
  onSelect,
  onVariantChange,
  onQuantityChange,
  onToast,
}) => {
  const [isFavorite, setIsFavorite] = React.useState(() => StorageService.isFavorite(item.cardId));

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedList = StorageService.toggleFavorite(item.cardId);
    const isNowFav = updatedList.includes(item.cardId);
    setIsFavorite(isNowFav);
    if (onToast) {
      onToast(isNowFav ? 'Carta adicionada às favoritas ♥' : 'Carta removida das favoritas');
    }
  };

  const rarityInfo = getRarityDisplay(card?.rarity);
  const variantStyle = getVariantBadgeStyle(item.variant);

  const marketPrice = PriceService.getCardMarketPrice(card, item.variant);
  const formattedPrice =
    marketPrice !== null && marketPrice > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(marketPrice)
      : '—';

  return (
    <div
      onClick={onSelect}
      className="group bg-[#091124] hover:bg-[#0d1833] border border-slate-800/80 hover:border-red-500/50 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-all duration-150 select-none shadow-sm hover:shadow-md"
    >
      {/* Left: Thumbnail + Favorite + Name + Collector # */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Card Thumbnail */}
        <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden bg-slate-950 border border-slate-700/60 shrink-0 relative">
          {card?.image ? (
            <img
              src={card.image}
              alt={card.name}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
              ?
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-red-400 truncate transition-colors">
              {card?.name || item.cardId}
            </h4>
            <button
              onClick={toggleFavorite}
              className={`p-0.5 rounded transition-colors ${
                isFavorite ? 'text-red-500' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-red-500' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400 font-mono">
            <span className="text-slate-300 truncate max-w-[120px]">{card?.setName || 'Set'}</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">
              #{card?.localId || ''}
              {card?.setTotalCards ? `/${card.setTotalCards}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Rarity Badge & Variant Selector */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${rarityInfo.colorClass}`}
        >
          <span>{rarityInfo.icon}</span>
          <span>{rarityInfo.label}</span>
        </span>

        <select
          value={item.variant}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onVariantChange(e.target.value as CardVariant);
          }}
          className={`text-[10px] font-black px-2 py-1 rounded-lg border cursor-pointer backdrop-blur outline-none ${variantStyle.bg}`}
        >
          <option value="normal">⚪ Normal</option>
          <option value="holo">✨ Holo Foil</option>
          <option value="reverse">🌟 Reversa</option>
          <option value="cosmosHolo">🌌 Cosmos</option>
          <option value="promo">⭐ Promo</option>
          <option value="stamped">🎖️ Stamped</option>
        </select>
      </div>

      {/* Right: Quantity Stepper & Price */}
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        {/* Quantity Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5"
        >
          <button
            onClick={() => onQuantityChange(Math.max(1, item.quantity - 1))}
            disabled={item.quantity <= 1}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="px-2 text-xs font-mono font-black text-emerald-400">
            {item.quantity}
          </span>
          <button
            onClick={() => onQuantityChange(item.quantity + 1)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Market Price */}
        <div className="text-right min-w-[70px]">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Valor</div>
          <div
            className={`text-xs font-mono font-black ${
              formattedPrice !== '—' ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {formattedPrice}
          </div>
        </div>
      </div>
    </div>
  );
};
