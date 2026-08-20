import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  History,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { CardLanguage, CardVariant, CollectionFinancialSummary, CollectionItem, PokemonCard, TopMarketMover } from '../../types';
import { StorageService } from '../../services/storage';
import { CardProvider } from '../../services/cardProvider';
import { InvestmentService } from '../../services/investment/InvestmentService';
import { PriceService } from '../../services/pricing/PriceService';
import { BrazilianPriceParser } from '../../services/pricing/BrazilianPriceParser';
import { TransactionModal } from './TransactionModal';

interface MarketViewProps {
  preferredLanguage: CardLanguage;
  onSelectCard: (card: PokemonCard, variant?: CardVariant) => void;
}

export const MarketView: React.FC<MarketViewProps> = ({
  preferredLanguage,
  onSelectCard,
}) => {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [cardMap, setCardMap] = useState<Record<string, PokemonCard>>({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [selectedTxCard, setSelectedTxCard] = useState<PokemonCard | undefined>(undefined);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadMarketData = async () => {
    setLoading(true);
    const items = StorageService.getCollection();
    setCollection(items);

    const uniqueIds = Array.from(new Set(items.map((i) => i.cardId)));
    if (uniqueIds.length > 0) {
      const cards = await CardProvider.getCardsByIds(uniqueIds, preferredLanguage);
      setCardMap(cards);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMarketData();
  }, [preferredLanguage]);

  const financialSummary: CollectionFinancialSummary = useMemo(() => {
    return InvestmentService.calculateFinancialSummary(collection, cardMap);
  }, [collection, cardMap]);

  const rankings = useMemo(() => {
    return InvestmentService.getMarketRankings(collection, cardMap);
  }, [collection, cardMap]);

  const transactions = useMemo(() => {
    return InvestmentService.getTransactions();
  }, [collection]);

  const handleSyncMarket = async () => {
    setIsSyncing(true);
    const total = collection.length;
    setSyncProgress({ current: 0, total });

    for (let i = 0; i < total; i++) {
      const item = collection[i];
      const card = cardMap[item.cardId];
      if (card) {
        const currentPrice = PriceService.getCardMarketPrice(card, item.variant, item.condition);
        PriceService.recordPricePoint(item.cardId, item.variant, currentPrice, 'Liga/MYP Batch');
      }
      setSyncProgress({ current: i + 1, total });
      await new Promise((r) => setTimeout(r, 40));
    }

    setIsSyncing(false);
    showToast('Cotações de mercado sincronizadas com sucesso! 📈');
  };

  const formatBRL = BrazilianPriceParser.formatBRL;

  return (
    <div className="space-y-7 pb-20 max-w-[1540px] mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900/95 border border-emerald-500/40 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/10 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                  Mercado & Investimento
                </h1>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                  BRL • Mediana de Fontes
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Acompanhe o valor patrimonial da sua coleção, valorização por carta, histórico e vendas realizadas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleSyncMarket}
              disabled={isSyncing || collection.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{isSyncing ? `Sincronizando ${syncProgress.current}/${syncProgress.total}` : 'Atualizar Mercado'}</span>
            </button>

            <button
              onClick={() => {
                setSelectedTxCard(collection.length > 0 ? cardMap[collection[0].cardId] : undefined);
                setIsTxModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Transação</span>
            </button>
          </div>
        </div>

        {/* 2. Portfolio Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          {/* Card 1: Valor Atual */}
          <div className="bg-[#080f21] border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Valor da Coleção</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {formatBRL(financialSummary.currentMarketValue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">patrimônio total em cartas</div>
          </div>

          {/* Card 2: Total Investido */}
          <div className="bg-[#080f21] border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Investido (Custo)</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {formatBRL(financialSummary.totalInvested)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {financialSummary.totalPurchasesCount > 0
                ? `${financialSummary.totalPurchasesCount} compras registradas`
                : 'custo médio estimado'}
            </div>
          </div>

          {/* Card 3: Lucro Não Realizado */}
          <div className="bg-[#080f21] border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Resultado Atual</span>
              {financialSummary.unrealizedProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div
              className={`text-2xl sm:text-3xl font-black font-mono ${
                financialSummary.unrealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {financialSummary.unrealizedProfit >= 0 ? '+' : ''}
              {formatBRL(financialSummary.unrealizedProfit)}
            </div>
            <div
              className={`text-[11px] font-bold mt-0.5 flex items-center gap-1 ${
                financialSummary.unrealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {financialSummary.unrealizedProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>
                {financialSummary.unrealizedProfitPercentage >= 0 ? '+' : ''}
                {financialSummary.unrealizedProfitPercentage.toFixed(1)}% retorno
              </span>
            </div>
          </div>

          {/* Card 4: Lucro Realizado (Vendas) */}
          <div className="bg-[#080f21] border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Lucro Realizado</span>
              <BarChart3 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {formatBRL(financialSummary.realizedProfit)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {financialSummary.totalSalesCount} vendas finalizadas ({formatBRL(financialSummary.totalSalesVolume)} vol.)
            </div>
          </div>
        </div>
      </div>

      {/* 3. Market Movers: Top Gainers / Losers & Most Valuable */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Maiores Valorizações */}
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Maiores Valorizações
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Top %</span>
          </div>

          <div className="space-y-2.5">
            {rankings.topGainers.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhuma valorização registrada ainda</p>
            ) : (
              rankings.topGainers.map((m) => (
                <div
                  key={`${m.cardId}-${m.variant}`}
                  onClick={() => m.card && onSelectCard(m.card, m.variant)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#080f21] hover:bg-[#0d1833] border border-slate-800/80 hover:border-emerald-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-11 bg-slate-950 rounded-lg overflow-hidden border border-slate-700/60 shrink-0">
                      {m.card?.image && (
                        <img src={m.card.image} alt={m.card.name} className="w-full h-full object-contain" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 truncate">
                        {m.card?.name || m.cardId}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {m.variant} • {m.card?.setName || 'Set'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-black text-slate-200">
                      {formatBRL(m.currentPrice)}
                    </div>
                    <div className="text-[10px] font-mono font-bold text-emerald-400">
                      +{m.changePercentage}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Maiores Quedas / Oportunidades */}
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Maiores Quedas
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Queda %</span>
          </div>

          <div className="space-y-2.5">
            {rankings.topLosers.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhuma queda registrada</p>
            ) : (
              rankings.topLosers.map((m) => (
                <div
                  key={`${m.cardId}-${m.variant}`}
                  onClick={() => m.card && onSelectCard(m.card, m.variant)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#080f21] hover:bg-[#0d1833] border border-slate-800/80 hover:border-rose-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-11 bg-slate-950 rounded-lg overflow-hidden border border-slate-700/60 shrink-0">
                      {m.card?.image && (
                        <img src={m.card.image} alt={m.card.name} className="w-full h-full object-contain" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-rose-400 truncate">
                        {m.card?.name || m.cardId}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {m.variant} • {m.card?.setName || 'Set'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-black text-slate-200">
                      {formatBRL(m.currentPrice)}
                    </div>
                    <div className="text-[10px] font-mono font-bold text-rose-400">
                      {m.changePercentage}%
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Cartas Mais Valiosas */}
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Cartas Mais Valiosas
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Maior Valor</span>
          </div>

          <div className="space-y-2.5">
            {rankings.mostValuable.map((m) => (
              <div
                key={`${m.cardId}-${m.variant}`}
                onClick={() => m.card && onSelectCard(m.card, m.variant)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#080f21] hover:bg-[#0d1833] border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-11 bg-slate-950 rounded-lg overflow-hidden border border-slate-700/60 shrink-0">
                    {m.card?.image && (
                      <img src={m.card.image} alt={m.card.name} className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 truncate">
                      {m.card?.name || m.cardId}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {m.variant} • #{m.card?.localId || ''}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-black text-emerald-400">
                    {formatBRL(m.currentPrice)}
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">
                    Cotação Atual
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Transactions Registry List */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Histórico de Transações Financeiras</h3>
              <p className="text-xs text-slate-400">
                Registro de compras e vendas para controle de lucratividade e custo contábil
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedTxCard(collection.length > 0 ? cardMap[collection[0].cardId] : undefined);
              setIsTxModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold transition-all"
          >
            + Adicionar Registro
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs space-y-2">
            <p>Nenhuma compra ou venda registrada manualmente ainda.</p>
            <p className="text-[11px] text-slate-600">
              Clique no botão acima para cadastrar o valor que pagou em boosters, avulsas ou vendas realizadas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080f21] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Carta</th>
                  <th className="p-3">Variante</th>
                  <th className="p-3">Qtd</th>
                  <th className="p-3">Valor Unit.</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Loja / Comprador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-slate-400">{tx.date}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          tx.type === 'purchase'
                            ? 'bg-blue-950/60 text-blue-300 border border-blue-500/40'
                            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {tx.type === 'purchase' ? 'Compra' : 'Venda'}
                      </span>
                    </td>
                    <td className="p-3 font-sans font-bold text-slate-200">{tx.cardName}</td>
                    <td className="p-3 uppercase text-slate-400">{tx.variant}</td>
                    <td className="p-3 text-white font-bold">{tx.quantity}</td>
                    <td className="p-3 text-slate-300">{formatBRL(tx.unitPrice)}</td>
                    <td
                      className={`p-3 font-bold ${
                        tx.type === 'sale' ? 'text-emerald-400' : 'text-blue-300'
                      }`}
                    >
                      {formatBRL(tx.unitPrice * tx.quantity)}
                    </td>
                    <td className="p-3 font-sans text-slate-400">
                      {tx.buyerOrStore || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {isTxModalOpen && (
        <TransactionModal
          card={selectedTxCard}
          onClose={() => setIsTxModalOpen(false)}
          onSuccess={(msg) => {
            loadMarketData();
            showToast(msg);
          }}
        />
      )}
    </div>
  );
};
