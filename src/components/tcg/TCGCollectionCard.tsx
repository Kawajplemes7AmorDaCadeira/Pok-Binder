import React, { useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { CardVariant, CollectionItem, PokemonCard } from '../../types';
import { CardImage } from '../CardImage';
import { StorageService } from '../../services/storage';
import { PriceService } from '../../services/pricing/PriceService';

interface TCGCollectionCardProps {
  item: CollectionItem;
  card?: PokemonCard;
  isCompact?: boolean;
  onSelect: () => void;
  onVariantChange: (newVariant: CardVariant) => void;
  onToast?: (msg: string) => void;
}

export const getRarityDisplay = (rarity?: string) => {
  if (!rarity) return { icon: '●', label: 'Comum', colorClass: 'text-slate-400 border-slate-700/60 bg-slate-800/40' };
  const r = rarity.toLowerCase();

  if (r.includes('secret') || r.includes('hyper') || r.includes('gold')) {
    return { icon: '★', label: 'Secret Rare', colorClass: 'text-amber-300 border-amber-500/40 bg-amber-950/40 shadow-sm shadow-amber-500/20' };
  }
  if (r.includes('illustration') || r.includes('special')) {
    return { icon: '★', label: 'Illustration Rare', colorClass: 'text-purple-300 border-purple-500/40 bg-purple-950/40 shadow-sm shadow-purple-500/20' };
  }
  if (r.includes('ultra') || r.includes('vmax') || r.includes('vstar') || r.includes('ex')) {
    return { icon: '★', label: 'Ultra Rare', colorClass: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40' };
  }
  if (r.includes('rare') || r.includes('holo')) {
    return { icon: '★', label: 'Rara', colorClass: 'text-amber-400 border-amber-500/30 bg-amber-950/30' };
  }
  if (r.includes('uncommon') || r.includes('incomum')) {
    return { icon: '◆', label: 'Incomum', colorClass: 'text-sky-400 border-sky-500/30 bg-sky-950/30' };
  }
  return { icon: '●', label: 'Comum', colorClass: 'text-slate-400 border-slate-700/60 bg-slate-800/40' };
};

export const getVariantBadgeStyle = (variant: CardVariant) => {
  switch (variant) {
    case 'holo':
      return { label: 'FOIL', bg: 'bg-purple-950/90 text-purple-200 border-purple-500/60 shadow-sm shadow-purple-500/30' };
    case 'reverse':
      return { label: 'REVERSE', bg: 'bg-pink-950/90 text-pink-200 border-pink-500/60 shadow-sm shadow-pink-500/30' };
    case 'cosmosHolo':
      return { label: 'COSMOS', bg: 'bg-indigo-950/90 text-cyan-200 border-cyan-500/60' };
    case 'promo':
      return { label: 'PROMO', bg: 'bg-amber-950/90 text-amber-200 border-amber-500/60' };
    case 'stamped':
      return { label: 'STAMPED', bg: 'bg-emerald-950/90 text-emerald-200 border-emerald-500/60' };
    default:
      return { label: 'NORMAL', bg: 'bg-slate-900/90 text-slate-300 border-slate-700/80' };
  }
};

export const TCGCollectionCard: React.FC<TCGCollectionCardProps> = ({
  item,
  card,
  isCompact = false,
  onSelect,
  onVariantChange,
  onToast,
}) => {
  const [isFavorite, setIsFavorite] = useState(() => StorageService.isFavorite(item.cardId));

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

  // Market Price Calculation via PriceService
  const marketPrice = PriceService.getCardMarketPrice(card, item.variant);
  const formattedPrice =
    marketPrice !== null && marketPrice > 0
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(marketPrice)
      : '—';

  const isFoil = item.variant !== 'normal';

  return (
    <div
      onClick={onSelect}
      className={`group relative bg-[#091124] border border-slate-800/90 hover:border-red-500/80 rounded-2xl cursor-pointer select-none tcg-card-hover shadow-lg hover:shadow-red-500/10 flex flex-col justify-between overflow-hidden ${
        isCompact ? 'p-2' : 'p-3'
      }`}
    >
      {/* Top Interactive Toolbar Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-auto">
        {/* Quantity Badge */}
        <span className="bg-emerald-600/95 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-md border border-emerald-400/80 backdrop-blur-md">
          x{item.quantity}
        </span>

        {/* Top Right: Favorite + Variant Selector */}
        <div className="flex items-center gap-1.5">
          {/* Favorite Heart Micro-indicator */}
          <button
            onClick={toggleFavorite}
            aria-label="Favoritar carta"
            className={`p-1 rounded-lg backdrop-blur-md transition-all ${
              isFavorite
                ? 'bg-red-500/20 text-red-500 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                : 'bg-slate-900/80 text-slate-500 hover:text-red-400 border border-slate-700/60 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart className={`w-3 h-3 ${isFavorite ? 'fill-red-500' : ''}`} />
          </button>

          {/* Direct Variant Selector */}
          <select
            value={item.variant}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onVariantChange(e.target.value as CardVariant);
            }}
            className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-lg border cursor-pointer backdrop-blur outline-none transition-all ${variantStyle.bg}`}
          >
            <option value="normal">⚪ NORMAL</option>
            <option value="holo">✨ HOLO</option>
            <option value="reverse">🌟 REVERSA</option>
            <option value="cosmosHolo">🌌 COSMOS</option>
            <option value="promo">⭐ PROMO</option>
            <option value="stamped">🎖️ STAMPED</option>
          </select>
        </div>
      </div>

      {/* 1. Main Card Artwork with Foil shader support */}
      <div className={`aspect-[3/4] w-full rounded-xl overflow-hidden pt-1.5 ${isCompact ? 'mb-1.5' : 'mb-2.5'}`}>
        <CardImage
          src={card?.image}
          alt={card?.name || item.cardId}
          rarity={card?.rarity}
          card={card}
          variant={item.variant}
          showVariantBadge={false}
          showZoomHint
        />
      </div>

      {/* 2. Structured Metadata Content Box */}
      <div className="space-y-1.5 pt-1.5 border-t border-slate-800/70">
        {/* Card Name */}
        <div className="flex items-start justify-between gap-1">
          <h4
            className={`font-black text-slate-100 group-hover:text-red-400 truncate transition-colors ${
              isCompact ? 'text-[11px]' : 'text-xs'
            }`}
            title={card?.name || item.cardId}
          >
            {card?.name || item.cardId}
          </h4>
        </div>

        {/* Collector Number & Set Code */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="truncate max-w-[95px] text-slate-400">
            {card?.setName || 'Set'}
          </span>
          <span className="font-bold text-amber-400 shrink-0">
            #{card?.localId || ''}
            {card?.setTotalCards ? `/${card.setTotalCards}` : ''}
          </span>
        </div>

        {/* Variant & Rarity Badges Row */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          {/* Rarity Badge with Symbol */}
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${rarityInfo.colorClass}`}
            title={`Raridade: ${rarityInfo.label}`}
          >
            <span>{rarityInfo.icon}</span>
            <span className="truncate max-w-[65px]">{rarityInfo.label}</span>
          </span>

          {/* Condition or Foil indicator */}
          <span className="text-[9px] font-bold text-slate-400 font-mono">
            {item.condition === 'near_mint' ? 'NM' : item.condition === 'mint' ? 'MINT' : 'LP'}
          </span>
        </div>

        {/* 3. Bottom Row: Quantity & Market Value */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
          <span className="text-[10px] font-bold text-slate-400 font-mono">
            {item.quantity > 1 ? (
              <span className="text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-500/30">
                Duplicada
              </span>
            ) : (
              <span className="text-slate-500">Única</span>
            )}
          </span>

          {/* Market Price Indicator */}
          <div className="text-right">
            <span
              className={`text-[11px] font-mono font-black ${
                formattedPrice !== '—' ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {formattedPrice}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
