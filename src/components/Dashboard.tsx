import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Camera,
  CheckCircle,
  DollarSign,
  FolderTree,
  History,
  Layers,
  Plus,
  Sparkles,
  Sword,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { PriceService } from '../services/pricing/PriceService';
import { BrazilianPriceParser } from '../services/pricing/BrazilianPriceParser';
import { InvestmentService } from '../services/investment/InvestmentService';
import { CollectionAnalyticsService, InsightItem } from '../services/analytics/CollectionAnalyticsService';
import { CardSet, CollectionItem, Deck, PokemonCard, TopMarketMover } from '../types';
import { CardImage } from './CardImage';
import { InsightCard } from './dashboard/InsightCard';

interface DashboardProps {
  onNavigate: (tab: any, params?: any) => void;
  onSelectCard: (card: PokemonCard) => void;
  onOpenScanner?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onSelectCard, onOpenScanner }) => {
  const [sets, setSets] = useState<CardSet[]>([]);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardMap, setCardMap] = useState<Record<string, PokemonCard>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      const colItems = StorageService.getCollection();
      const userDecks = StorageService.getDecks();
      const availableSets = await CardProvider.getSets('pt');

      setCollection(colItems);
      setDecks(userDecks);
      setSets(availableSets);

      const uniqueIds = Array.from(new Set(colItems.map((i) => i.cardId)));
      if (uniqueIds.length > 0) {
        try {
          const fetchedCards = await CardProvider.getCardsByIds(uniqueIds, 'pt');
          setCardMap(fetchedCards);
        } catch (e) {
          console.error('Error loading dashboard cards', e);
        }
      }
      setLoading(false);
    }

    loadDashboardData();
  }, []);

  // Compute portfolio financial stats via centralized service
  const financialSummary = useMemo(() => {
    return InvestmentService.calculateFinancialSummary(collection, cardMap);
  }, [collection, cardMap]);

  // Compute algorithm-driven insights
  const insights: InsightItem[] = useMemo(() => {
    const wishlist = StorageService.getWishlist();
    return CollectionAnalyticsService.generateInsights(collection, cardMap, wishlist);
  }, [collection, cardMap]);

  // Compute most valuable cards
  const rankings = useMemo(() => {
    return InvestmentService.getMarketRankings(collection, cardMap);
  }, [collection, cardMap]);

  // Compute top completed expansions
  const expansionStats = useMemo(() => {
    const map = new Map<string, { set: CardSet; owned: number }>();

    sets.forEach((s) => {
      map.set(s.id, { set: s, owned: 0 });
    });

    collection.forEach((item) => {
      const card = cardMap[item.cardId];
      if (card && card.setId && map.has(card.setId)) {
        map.get(card.setId)!.owned += 1;
      }
    });

    return Array.from(map.values())
      .filter((e) => e.owned > 0)
      .map((e) => {
        const total = e.set.cardCount?.official || 100;
        const percentage = Math.min(100, Math.round((e.owned / total) * 100));
        return {
          set: e.set,
          owned: e.owned,
          total,
          percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);
  }, [sets, collection, cardMap]);

  const recentTimeline = useMemo(() => {
    return InvestmentService.getTimelineEvents().slice(0, 4);
  }, [collection]);

  const formatBRL = BrazilianPriceParser.formatBRL;

  const totalCopies = collection.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-7 pb-20 max-w-[1540px] mx-auto">
      {/* 1. Welcome Banner */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Olá, Treinador 👋
              </h1>
              <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-300">
                PokéBinder Platform v3.0
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Visão geral do seu patrimônio em cartas Pokémon, progresso de expansões e decks ativos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-xs font-black transition-all shadow-lg shadow-red-600/30 active:scale-95"
              >
                <Camera className="w-4 h-4" /> Escanear Carta
              </button>
            )}

            <button
              onClick={() => onNavigate('catalog')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
            >
              <Plus className="w-4 h-4" /> Adicionar Cartas
            </button>

            <button
              onClick={() => onNavigate('market')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              <TrendingUp className="w-4 h-4" /> Central de Mercado
            </button>
          </div>
        </div>

        {/* Financial & Collection Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div
            onClick={() => onNavigate('market')}
            className="bg-[#080f21] border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Valor Estimado</span>
              <DollarSign className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-mono font-black text-emerald-400">
              {formatBRL(financialSummary.currentMarketValue)}
            </div>
            <div className="text-[11px] font-bold text-emerald-400/90 mt-0.5 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>{financialSummary.unrealizedProfitPercentage >= 0 ? '+' : ''}{financialSummary.unrealizedProfitPercentage.toFixed(1)}% retorno</span>
            </div>
          </div>

          <div
            onClick={() => onNavigate('collection')}
            className="bg-[#080f21] border border-slate-800/80 hover:border-blue-500/50 rounded-2xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total de Cartas</span>
              <Layers className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-mono font-black text-white">
              {collection.length}{' '}
              <span className="text-xs text-slate-400 font-sans font-normal">
                ({totalCopies} cópias)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">no fichário digital</div>
          </div>

          <div
            onClick={() => onNavigate('sets')}
            className="bg-[#080f21] border border-slate-800/80 hover:border-amber-500/50 rounded-2xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Expansões</span>
              <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-mono font-black text-amber-400">
              {expansionStats.length}{' '}
              <span className="text-xs text-slate-400 font-sans font-normal">em progresso</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">coleções ativas</div>
          </div>

          <div
            onClick={() => onNavigate('decks')}
            className="bg-[#080f21] border border-slate-800/80 hover:border-purple-500/50 rounded-2xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">Meus Decks</span>
              <Sword className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-mono font-black text-purple-300">
              {decks.length}{' '}
              <span className="text-xs text-slate-400 font-sans font-normal">construídos</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">prontos para jogar</div>
          </div>
        </div>
      </div>

      {/* 2. Algorithmic Smart Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Insights da sua Coleção
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Calculado automaticamente</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onActionClick={(target) => onNavigate(target)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Mid Grid: Top Expansions & Most Valuable Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Expansões Mais Completas */}
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400">
                <Trophy className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Expansões Mais Completas
              </h3>
            </div>

            <button
              onClick={() => onNavigate('sets')}
              className="text-xs font-bold text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              Ver Todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {expansionStats.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Nenhuma expansão iniciada ainda.</p>
            ) : (
              expansionStats.map((item) => (
                <div
                  key={item.set.id}
                  onClick={() => onNavigate('binder', { setId: item.set.id })}
                  className="bg-[#080f21] hover:bg-[#0d1833] border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-3.5 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        {item.set.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.owned} de {item.total} cartas
                      </span>
                    </div>

                    <span className="text-xs font-mono font-black text-amber-400">
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Cartas Mais Valiosas */}
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Cartas Mais Valiosas
              </h3>
            </div>

            <button
              onClick={() => onNavigate('market')}
              className="text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              Mercado Completo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {rankings.mostValuable.slice(0, 4).map((m) => (
              <div
                key={`${m.cardId}-${m.variant}`}
                onClick={() => m.card && onSelectCard(m.card)}
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
                  <div className="text-xs font-mono font-black text-emerald-400">
                    {formatBRL(m.currentPrice)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">Cotação Atual</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Atividade Recente (Timeline summary) */}
      {recentTimeline.length > 0 && (
        <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Atividade Recente
              </h3>
            </div>

            <button
              onClick={() => onNavigate('timeline')}
              className="text-xs font-bold text-slate-400 hover:text-blue-400 flex items-center gap-1 transition-colors"
            >
              Ver Linha do Tempo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentTimeline.map((item) => (
              <div key={item.id} className="p-3 bg-[#080f21] border border-slate-800/80 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-200 truncate">{item.title}</div>
                <div className="text-[11px] text-slate-400 line-clamp-2">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
