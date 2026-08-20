import React from 'react';
import {
  Check,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Info,
  DollarSign,
} from 'lucide-react';
import { CardCondition, CardLanguage, CardVariant, PokemonCard } from '../../types';
import { CardCandidate, ScanRecognitionResult } from '../../services/scanner/types';
import { CardImage } from '../CardImage';
import { PriceService } from '../../services/pricing/PriceService';
import { BrazilianPriceParser } from '../../services/pricing/BrazilianPriceParser';
import { StorageService } from '../../services/storage';

interface ScannerResultProps {
  card: PokemonCard;
  recognitionResult: ScanRecognitionResult;
  preferredLanguage: CardLanguage;
  selectedVariant: CardVariant;
  onChangeVariant: (variant: CardVariant) => void;
  selectedCondition: CardCondition;
  onChangeCondition: (condition: CardCondition) => void;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
  acquiredPrice: string;
  onChangeAcquiredPrice: (price: string) => void;
  onConfirmAdd: () => void;
  onScanNext: () => void;
  onShowOtherCandidates?: () => void;
  isJustAdded: boolean;
  onOpenCardDetail?: (card: PokemonCard) => void;
}

export const ScannerResult: React.FC<ScannerResultProps> = ({
  card,
  recognitionResult,
  preferredLanguage,
  selectedVariant,
  onChangeVariant,
  selectedCondition,
  onChangeCondition,
  quantity,
  onChangeQuantity,
  acquiredPrice,
  onChangeAcquiredPrice,
  onConfirmAdd,
  onScanNext,
  onShowOtherCandidates,
  isJustAdded,
  onOpenCardDetail,
}) => {
  // Check existing quantity in collection for duplicate detection
  const existingQuantity = StorageService.getCardTotalQuantity(card.id);
  const isDuplicate = existingQuantity > 0;

  // Pricing calculation
  const aggPrice = PriceService.getAggregatedMarketPrice(card, selectedVariant);
  const marketPriceDisplay = aggPrice.marketPrice
    ? BrazilianPriceParser.formatBRL(aggPrice.marketPrice)
    : 'Sob Consulta';

  // Confidence styling
  const confidence = recognitionResult.confidence;
  const isHigh = recognitionResult.level === 'HIGH';
  const isMedium = recognitionResult.level === 'MEDIUM';

  return (
    <div className="space-y-4 max-w-xl mx-auto animate-slideUp">
      {/* Top Header Status & Confidence Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isHigh ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
            }`}
          />
          <h4 className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            Carta Reconhecida
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                isHigh
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {confidence}% {isHigh ? 'Alta Confiança' : 'Confiança Média'}
            </span>
          </h4>
        </div>

        {recognitionResult.candidates.length > 1 && onShowOtherCandidates && (
          <button
            onClick={onShowOtherCandidates}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline"
          >
            Ver outras ({recognitionResult.candidates.length})
          </button>
        )}
      </div>

      {/* Duplicate Alert Banner */}
      {isDuplicate && (
        <div className="bg-blue-950/80 border border-blue-600/60 p-2.5 rounded-xl flex items-center justify-between text-xs text-blue-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Carta já na coleção! Quantidade atual: <strong>{existingQuantity}</strong>
            </span>
          </div>
          <span className="text-[11px] font-black bg-blue-600/30 px-2 py-0.5 rounded border border-blue-500/40 text-blue-300">
            {existingQuantity} → {existingQuantity + quantity}
          </span>
        </div>
      )}

      {/* Card Visual Details Box */}
      <div className="flex gap-3.5 items-center bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
        <div className="w-18 h-26 shrink-0 rounded-xl overflow-hidden border border-slate-700 shadow-md bg-slate-950">
          <CardImage
            card={card}
            alt={card.name}
            variant={selectedVariant}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h3 className="text-white font-black text-sm sm:text-base truncate">{card.name}</h3>
            {card.hp && (
              <span className="text-[11px] font-black text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800">
                HP {card.hp}
              </span>
            )}
          </div>

          <p className="text-slate-400 text-xs truncate mt-0.5">
            {card.setName} • #{card.localId}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">
              {card.rarity || 'Comum'}
            </span>
            <span className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {marketPriceDisplay}
            </span>
          </div>
        </div>

        {onOpenCardDetail && (
          <button
            onClick={() => onOpenCardDetail(card)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold shrink-0 transition-colors"
          >
            Ficha
          </button>
        )}
      </div>

      {/* Variant & Condition Selectors Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Variant Picker */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-400">Variante:</label>
            {recognitionResult.suggestedVariant && (
              <span className="text-[9px] text-amber-400 font-semibold">
                {recognitionResult.suggestedVariant === 'holo' ? 'Foil Provável' : 'Padrão'}
              </span>
            )}
          </div>
          <select
            value={selectedVariant}
            onChange={(e) => onChangeVariant(e.target.value as CardVariant)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-red-500"
          >
            <option value="normal">Normal / Regular</option>
            <option value="holo">Foil / Holofote</option>
            <option value="reverse">Reverse Holo</option>
            <option value="firstEdition">1ª Edição</option>
            <option value="promo">Promo</option>
            <option value="stamped">Estampada (Stamped)</option>
          </select>
        </div>

        {/* Condition Picker */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400">Estado de Conservação:</label>
          <select
            value={selectedCondition}
            onChange={(e) => onChangeCondition(e.target.value as CardCondition)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-red-500"
          >
            <option value="mint">Mint (Perfeita)</option>
            <option value="near_mint">Near Mint (Excelente)</option>
            <option value="lightly_played">Lightly Played (Pouco Usada)</option>
            <option value="moderately_played">Moderately Played (Marcada)</option>
            <option value="heavily_played">Heavily Played (Desgastada)</option>
            <option value="damaged">Damaged (Danificada)</option>
          </select>
        </div>
      </div>

      {/* Quantity & Paid Price Optional Bar */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Quantity Controls */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400">Quantidade:</label>
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 justify-between">
            <button
              onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-black hover:bg-slate-700 flex items-center justify-center text-sm"
            >
              -
            </button>
            <span className="font-black text-white text-xs">{quantity}</span>
            <button
              onClick={() => onChangeQuantity(quantity + 1)}
              className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-black hover:bg-slate-700 flex items-center justify-center text-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Paid Price (Optional) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" /> Preço Pago (Opcional):
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="R$ 0,00"
            value={acquiredPrice}
            onChange={(e) => onChangeAcquiredPrice(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Main Bottom CTA Button Toolbar (One-Hand Ergonomics) */}
      <div className="flex gap-2.5 pt-1">
        <button
          onClick={onConfirmAdd}
          className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
            isJustAdded
              ? 'bg-emerald-600 text-white shadow-emerald-600/40 scale-102'
              : 'bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-red-600/40 active:scale-95'
          }`}
        >
          {isJustAdded ? (
            <>
              <Check className="w-4 h-4" /> Adicionado à Coleção!
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Confirmar e Adicionar (+{quantity})
            </>
          )}
        </button>

        <button
          onClick={onScanNext}
          className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
          title="Próxima Carta"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Próxima
        </button>
      </div>
    </div>
  );
};
