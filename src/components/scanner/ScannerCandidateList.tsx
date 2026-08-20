import React from 'react';
import { Check, HelpCircle, Layers, TrendingUp } from 'lucide-react';
import { CardLanguage, CardVariant, PokemonCard } from '../../types';
import { CardCandidate } from '../../services/scanner/types';
import { CardImage } from '../CardImage';
import { PriceService } from '../../services/pricing/PriceService';
import { BrazilianPriceParser } from '../../services/pricing/BrazilianPriceParser';

interface ScannerCandidateListProps {
  candidates: CardCandidate[];
  selectedCard: PokemonCard | null;
  onSelectCandidate: (candidate: CardCandidate) => void;
  preferredLanguage: CardLanguage;
  onManualSearchFallback: () => void;
}

export const ScannerCandidateList: React.FC<ScannerCandidateListProps> = ({
  candidates,
  selectedCard,
  onSelectCandidate,
  onManualSearchFallback,
}) => {
  return (
    <div className="space-y-3 animate-slideUp">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <h4 className="text-white text-xs font-black uppercase tracking-wider">
            Qual destas é a sua carta? ({candidates.length} encontradas)
          </h4>
        </div>
        <button
          onClick={onManualSearchFallback}
          className="text-[11px] text-slate-400 hover:text-white underline font-semibold"
        >
          Nenhuma destas
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[36vh] overflow-y-auto pr-1">
        {candidates.map((cand) => {
          const isSelected = selectedCard?.id === cand.card.id;
          const aggPrice = PriceService.getAggregatedMarketPrice(cand.card, 'normal');
          const priceDisplay = aggPrice.marketPrice
            ? BrazilianPriceParser.formatBRL(aggPrice.marketPrice)
            : 'Sob Consulta';

          return (
            <button
              key={cand.card.id}
              onClick={() => onSelectCandidate(cand)}
              className={`flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all relative ${
                isSelected
                  ? 'bg-red-600/20 border-red-500 text-white shadow-lg ring-1 ring-red-500'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Card Image Thumbnail */}
              <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950">
                <CardImage
                  card={cand.card}
                  alt={cand.card.name}
                  variant="normal"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Card Info & Confidence Badge */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-white text-xs font-black truncate">{cand.card.name}</h5>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      cand.confidence >= 80
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : cand.confidence >= 50
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cand.confidence}%
                  </span>
                </div>

                <p className="text-slate-400 text-[11px] truncate">
                  {cand.card.setName} • #{cand.card.localId}
                </p>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-400 font-semibold truncate">
                    {cand.card.rarity || 'Comum'}
                  </span>
                  <span className="text-[10px] font-black text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {priceDisplay}
                  </span>
                </div>
              </div>

              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
