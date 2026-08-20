import React, { useEffect, useState, useMemo } from 'react';
import { Copy, DollarSign, Plus, Search, Share2, Sparkles, TrendingUp } from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { PriceService } from '../services/pricing/PriceService';
import { CardLanguage, CollectionItem, PokemonCard } from '../types';
import { CardImage } from './CardImage';

interface DuplicatesViewProps {
  preferredLanguage: CardLanguage;
  onSelectCard: (card: PokemonCard) => void;
}

export const DuplicatesView: React.FC<DuplicatesViewProps> = ({
  preferredLanguage,
  onSelectCard,
}) => {
  const [duplicateItems, setDuplicateItems] = useState<CollectionItem[]>([]);
  const [cardMap, setCardMap] = useState<Record<string, PokemonCard>>({});
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'qty' | 'value_desc' | 'name'>('value_desc');

  useEffect(() => {
    async function loadDuplicates() {
      setLoading(true);
      const collection = StorageService.getCollection();
      const duplicates = collection.filter((i) => i.quantity > 1);
      setDuplicateItems(duplicates);

      const ids = Array.from(new Set(duplicates.map((i) => i.cardId)));
      if (ids.length > 0) {
        const metadata = await CardProvider.getCardsByIds(ids, preferredLanguage);
        setCardMap(metadata);
      }
      setLoading(false);
    }

    loadDuplicates();
  }, [preferredLanguage]);

  // Compute total value of the spare/surplus copies
  const totalSpareTradeValue = useMemo(() => {
    return duplicateItems.reduce((sum, item) => {
      const card = cardMap[item.cardId];
      if (!card) return sum;
      const spareQty = item.quantity - 1;
      const price = PriceService.getCardMarketPrice(card, item.variant || 'normal', item.condition);
      return sum + spareQty * price;
    }, 0);
  }, [duplicateItems, cardMap]);

  const totalSpareCount = duplicateItems.reduce((sum, item) => sum + (item.quantity - 1), 0);

  // Filtered and sorted duplicates
  const displayedItems = useMemo(() => {
    let list = duplicateItems.filter((item) => {
      const card = cardMap[item.cardId];
      const name = card?.name || item.cardId;
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (sortBy === 'value_desc') {
      list.sort((a, b) => {
        const cardA = cardMap[a.cardId];
        const cardB = cardMap[b.cardId];
        const priceA = cardA ? PriceService.getCardMarketPrice(cardA, a.variant || 'normal', a.condition) : 0;
        const priceB = cardB ? PriceService.getCardMarketPrice(cardB, b.variant || 'normal', b.condition) : 0;
        return priceB - priceA;
      });
    } else if (sortBy === 'qty') {
      list.sort((a, b) => b.quantity - a.quantity);
    } else if (sortBy === 'name') {
      list.sort((a, b) => {
        const nameA = cardMap[a.cardId]?.name || '';
        const nameB = cardMap[b.cardId]?.name || '';
        return nameA.localeCompare(nameB);
      });
    }

    return list;
  }, [duplicateItems, cardMap, searchQuery, sortBy]);

  const handleCopyTradeList = () => {
    const list = duplicateItems
      .map((item) => {
        const card = cardMap[item.cardId];
        const extraQty = item.quantity - 1;
        const price = card ? PriceService.getCardMarketPrice(card, item.variant || 'normal', item.condition) : 0;
        return `${extraQty}x ${card?.name || item.cardId} (${card?.setName || ''} #${card?.localId || ''}) [${item.variant || 'Normal'}] ~ R$ ${price.toFixed(2)}`;
      })
      .join('\n');

    navigator.clipboard.writeText(list);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="space-y-6 pb-16 max-w-[1540px] mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Copy className="w-6 h-6 text-amber-400" />
              Cartas Duplicadas para Troca
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifique suas cópias excedentes e seu poder de barganha para negociações.
            </p>
          </div>

          {duplicateItems.length > 0 && (
            <button
              onClick={handleCopyTradeList}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
            >
              <Share2 className="w-4 h-4" />
              {copiedText ? 'Lista Copiada!' : 'Copiar Lista Formatada'}
            </button>
          )}
        </div>

        {/* Capital & Count Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#080f21] p-4 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-400">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">Cópias Excedentes</div>
              <div className="text-base font-mono font-black text-white">
                {totalSpareCount} cópias sobressalentes
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">Capital de Troca Total</div>
              <div className="text-base font-mono font-black text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  totalSpareTradeValue
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar em duplicadas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 shrink-0 font-bold">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none"
            >
              <option value="value_desc">Maior Valor de Mercado</option>
              <option value="qty">Maior Quantidade</option>
              <option value="name">Nome da Carta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs">
          Nenhuma carta duplicada encontrada.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayedItems.map((item) => {
            const card = cardMap[item.cardId];
            const price = card ? PriceService.getCardMarketPrice(card, item.variant || 'normal', item.condition) : 0;
            const extraQty = item.quantity - 1;

            return (
              <div
                key={`${item.cardId}-${item.variant}`}
                onClick={() => card && onSelectCard(card)}
                className="bg-[#0b1329]/90 border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-2.5 cursor-pointer transition-all flex flex-col justify-between group shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono">
                  <span className="bg-amber-950/80 border border-amber-500/40 text-amber-300 font-black px-2 py-0.5 rounded-md">
                    +{extraQty} p/ troca
                  </span>
                  <span className="text-emerald-400 font-black">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      price
                    )}
                  </span>
                </div>

                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
                  {card ? (
                    <CardImage
                      src={card.image}
                      alt={card.name}
                      rarity={card.rarity}
                      card={card}
                      variant={item.variant}
                      showVariantBadge={true}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-950 flex items-center justify-center text-xs text-slate-500">
                      Carregando...
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200 truncate group-hover:text-amber-400 transition-colors">
                    {card?.name || item.cardId}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="uppercase">{item.variant || 'normal'}</span>
                    <span>Total: x{item.quantity}</span>
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
