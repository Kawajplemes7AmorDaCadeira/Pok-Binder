import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Minus,
  Plus,
  Scale,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { CardLanguage, CardVariant, CollectionItem, PokemonCard, TradeCardItem, TradeProposal } from '../../types';
import { StorageService } from '../../services/storage';
import { CardProvider } from '../../services/cardProvider';
import { PriceService } from '../../services/pricing/PriceService';
import { BrazilianPriceParser } from '../../services/pricing/BrazilianPriceParser';
import { TradeValueService } from '../../services/trade/TradeValueService';

interface TradeManagerViewProps {
  preferredLanguage: CardLanguage;
  onSelectCard: (card: PokemonCard, variant?: CardVariant) => void;
}

export const TradeManagerView: React.FC<TradeManagerViewProps> = ({
  preferredLanguage,
  onSelectCard,
}) => {
  const [trades, setTrades] = useState<TradeProposal[]>([]);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [cardMap, setCardMap] = useState<Record<string, PokemonCard>>({});

  // Active Proposal State
  const [tradeTitle, setTradeTitle] = useState('Negociação de Troca');
  const [traderName, setTraderName] = useState('');
  const [giveCards, setGiveCards] = useState<TradeCardItem[]>([]);
  const [receiveCards, setReceiveCards] = useState<TradeCardItem[]>([]);
  const [notes, setNotes] = useState('');

  // Search card modal to add into Give / Receive
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState<'give' | 'receive'>('give');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadData = async () => {
    const savedTrades = TradeValueService.getTrades();
    setTrades(savedTrades);

    const coll = StorageService.getCollection();
    setCollection(coll);

    const ids = Array.from(new Set(coll.map((c) => c.cardId)));
    if (ids.length > 0) {
      const cards = await CardProvider.getCardsByIds(ids, preferredLanguage);
      setCardMap(cards);
    }
  };

  useEffect(() => {
    loadData();
  }, [preferredLanguage]);

  // Search Cards for trade builder
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Default to collection cards for 'give', popular for 'receive'
      if (targetColumn === 'give') {
        setSearchResults(Object.values(cardMap).slice(0, 10));
      } else {
        setSearchResults([]);
      }
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const results = await CardProvider.searchCards({ searchQuery }, preferredLanguage);
      setSearchResults(results.cards.slice(0, 12));
      setIsSearching(false);
    }, 280);

    return () => clearTimeout(timeout);
  }, [searchQuery, targetColumn, cardMap, preferredLanguage]);

  const evaluation = TradeValueService.evaluateTrade(giveCards, receiveCards);

  const handleAddCardToTrade = (card: PokemonCard) => {
    const price = PriceService.getCardMarketPrice(card, 'normal');
    const newItem: TradeCardItem = {
      cardId: card.id,
      cardName: card.name,
      setName: card.setName,
      image: card.image,
      variant: 'normal',
      quantity: 1,
      unitPrice: price,
    };

    if (targetColumn === 'give') {
      setGiveCards((prev) => [...prev, newItem]);
    } else {
      setReceiveCards((prev) => [...prev, newItem]);
    }

    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleRemoveCard = (column: 'give' | 'receive', index: number) => {
    if (column === 'give') {
      setGiveCards((prev) => prev.filter((_, i) => i !== index));
    } else {
      setReceiveCards((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleQuantityChange = (column: 'give' | 'receive', index: number, qty: number) => {
    if (column === 'give') {
      const updated = [...giveCards];
      updated[index].quantity = Math.max(1, qty);
      setGiveCards(updated);
    } else {
      const updated = [...receiveCards];
      updated[index].quantity = Math.max(1, qty);
      setReceiveCards(updated);
    }
  };

  const handleSaveTrade = () => {
    if (giveCards.length === 0 && receiveCards.length === 0) {
      showToast('Adicione cartas à negociação antes de salvar!');
      return;
    }

    TradeValueService.saveTrade({
      title: tradeTitle,
      traderName,
      giveCards,
      receiveCards,
      status: 'rascunho',
      notes,
    });

    loadData();
    showToast('Proposta de troca salva com sucesso! 🤝');
  };

  const handleCompleteTrade = (tradeId: string) => {
    TradeValueService.completeTrade(tradeId, true);
    loadData();
    showToast('Troca concluída e fichário atualizado! 🎉');
  };

  const handleDeleteTrade = (tradeId: string) => {
    TradeValueService.deleteTrade(tradeId);
    loadData();
    showToast('Troca removida.');
  };

  const formatBRL = BrazilianPriceParser.formatBRL;

  return (
    <div className="space-y-7 pb-20 max-w-[1540px] mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 border border-purple-500/40 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-md shadow-purple-500/10 shrink-0">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                  Central de Trocas TCG
                </h1>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300">
                  Calculadora de Paridade
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Monte propostas de troca, compare valores de mercado de forma justa e atualize seu estoque.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveTrade}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Negociação</span>
            </button>
          </div>
        </div>

        {/* Trade Metadata inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800/80">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Título da Negociação</label>
            <input
              type="text"
              value={tradeTitle}
              onChange={(e) => setTradeTitle(e.target.value)}
              className="w-full bg-[#080f21] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Outro Colecionador / Loja</label>
            <input
              type="text"
              value={traderName}
              onChange={(e) => setTraderName(e.target.value)}
              placeholder="Ex: Pedro Silva, Bazar TCG..."
              className="w-full bg-[#080f21] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50"
            />
          </div>
        </div>
      </div>

      {/* 2. Interactive Trade Builder: Give vs Receive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column Left: EU ENTREGO */}
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Minha Oferta</span>
              <h3 className="text-base font-black text-white">EU ENTREGO</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Valor Ofertado</span>
              <span className="text-sm font-mono font-black text-rose-400">
                {formatBRL(evaluation.giveTotalValue)}
              </span>
            </div>
          </div>

          {/* Card list */}
          <div className="space-y-2 min-h-[140px]">
            {giveCards.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Nenhuma carta adicionada para entregar.
              </div>
            ) : (
              giveCards.map((item, idx) => (
                <div
                  key={`${item.cardId}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#080f21] border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-11 bg-slate-950 rounded-lg overflow-hidden border border-slate-700/60 shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.cardName} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600">?</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{item.cardName}</h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatBRL(item.unitPrice)} un.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => handleQuantityChange('give', idx, item.quantity - 1)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-mono font-black text-white">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange('give', idx, item.quantity + 1)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveCard('give', idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => {
              setTargetColumn('give');
              setIsSearchOpen(true);
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Adicionar Carta da Minha Coleção
          </button>
        </div>

        {/* Column Right: EU RECEBO */}
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Oferta Dele</span>
              <h3 className="text-base font-black text-white">EU RECEBO</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Valor Recebido</span>
              <span className="text-sm font-mono font-black text-emerald-400">
                {formatBRL(evaluation.receiveTotalValue)}
              </span>
            </div>
          </div>

          {/* Card list */}
          <div className="space-y-2 min-h-[140px]">
            {receiveCards.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Nenhuma carta adicionada para receber.
              </div>
            ) : (
              receiveCards.map((item, idx) => (
                <div
                  key={`${item.cardId}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#080f21] border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-11 bg-slate-950 rounded-lg overflow-hidden border border-slate-700/60 shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.cardName} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600">?</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{item.cardName}</h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatBRL(item.unitPrice)} un.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => handleQuantityChange('receive', idx, item.quantity - 1)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-mono font-black text-white">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange('receive', idx, item.quantity + 1)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveCard('receive', idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => {
              setTargetColumn('receive');
              setIsSearchOpen(true);
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Buscar Carta no Catálogo para Receber
          </button>
        </div>
      </div>

      {/* 3. Trade Balance Summary Meter */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-500/40 text-purple-400">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Avaliação de Paridade Financeira
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-lg font-black uppercase px-3 py-0.5 rounded-full border ${
                  evaluation.fairness === 'equilibrada'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                    : evaluation.fairness === 'vantajosa'
                    ? 'bg-blue-950/60 border-blue-500/40 text-blue-300'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                }`}
              >
                {evaluation.fairness === 'equilibrada'
                  ? '⚖️ Troca Equilibrada'
                  : evaluation.fairness === 'vantajosa'
                  ? '📈 Vantajosa para você'
                  : '📉 Desfavorável para você'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Diferença Líquida</div>
            <div
              className={`text-xl font-mono font-black ${
                evaluation.differenceValue >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {evaluation.differenceValue >= 0 ? '+' : ''}
              {formatBRL(evaluation.differenceValue)}
            </div>
          </div>

          <button
            onClick={handleSaveTrade}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
          >
            Salvar Proposta
          </button>
        </div>
      </div>

      {/* 4. Saved Trades History */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-black text-white">Negociações Salvas & Histórico</h3>

        {trades.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Nenhuma proposta salva ainda.</p>
        ) : (
          <div className="space-y-3">
            {trades.map((t) => (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#080f21] border border-slate-800/80 gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{t.title}</h4>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        t.status === 'concluida'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.traderName ? `Com: ${t.traderName} • ` : ''}
                    {t.giveCards.length} cartas entregues por {t.receiveCards.length} recebidas
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-mono">Diferença</div>
                    <div className="text-xs font-mono font-bold text-slate-200">
                      {formatBRL(t.differenceValue)}
                    </div>
                  </div>

                  {t.status !== 'concluida' && (
                    <button
                      onClick={() => handleCompleteTrade(t.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concluir Troca
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteTrade(t.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Card Search Selector Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                {targetColumn === 'give' ? 'Selecionar Carta para Entregar' : 'Buscar Carta para Receber'}
              </h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome da carta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-[#080f21] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {isSearching ? (
                <div className="text-center py-8 text-xs text-slate-500">Buscando cartas...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Nenhuma carta encontrada. Digite o nome acima.
                </div>
              ) : (
                searchResults.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => handleAddCardToTrade(card)}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#080f21] hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-11 bg-slate-950 rounded overflow-hidden">
                        {card.image && (
                          <img src={card.image} alt={card.name} className="w-full h-full object-contain" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{card.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{card.setName}</span>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {formatBRL(PriceService.getCardMarketPrice(card, 'normal'))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
