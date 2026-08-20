import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  DollarSign,
  History,
  Layers,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { CollectionTimelineEvent } from '../../types';
import { InvestmentService } from '../../services/investment/InvestmentService';
import { BrazilianPriceParser } from '../../services/pricing/BrazilianPriceParser';

export const CollectionTimeline: React.FC = () => {
  const [events, setEvents] = useState<CollectionTimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('all');

  const loadEvents = () => {
    const evs = InvestmentService.getTimelineEvents();
    setEvents(evs);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterType === 'all') return true;
    return e.type === filterType;
  });

  const getEventBadge = (type: CollectionTimelineEvent['type']) => {
    switch (type) {
      case 'purchase':
        return {
          icon: <ShoppingBag className="w-4 h-4 text-blue-400" />,
          bg: 'bg-blue-950/60 border-blue-500/40',
          titleColor: 'text-blue-300',
        };
      case 'sale':
        return {
          icon: <Tag className="w-4 h-4 text-emerald-400" />,
          bg: 'bg-emerald-950/60 border-emerald-500/40',
          titleColor: 'text-emerald-300',
        };
      case 'trade':
        return {
          icon: <ArrowLeftRight className="w-4 h-4 text-purple-400" />,
          bg: 'bg-purple-950/60 border-purple-500/40',
          titleColor: 'text-purple-300',
        };
      case 'card_added':
      default:
        return {
          icon: <PlusCircle className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-950/60 border-amber-500/40',
          titleColor: 'text-amber-300',
        };
    }
  };

  return (
    <div className="space-y-7 pb-20 max-w-[1200px] mx-auto">
      {/* 1. Header */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md shadow-blue-500/10 shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
                  Linha do Tempo
                </h1>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {events.length} eventos registrados
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Histórico cronológico de adições, compras, vendas, trocas e alterações de valor da sua coleção.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-[#080f21] border border-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('purchase')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'purchase' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Compras
            </button>
            <button
              onClick={() => setFilterType('sale')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'sale' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendas
            </button>
            <button
              onClick={() => setFilterType('trade')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'trade' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Trocas
            </button>
          </div>
        </div>
      </div>

      {/* 2. Timeline List */}
      <div className="bg-[#0b1329]/95 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-xl">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-2">
            <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
            <p>Nenhum evento registrado nesta categoria ainda.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-800 pl-6 ml-3 space-y-6">
            {filteredEvents.map((ev) => {
              const badge = getEventBadge(ev.type);
              const dateStr = new Date(ev.timestamp).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={ev.id} className="relative group">
                  {/* Node Icon on Timeline */}
                  <div
                    className={`absolute -left-[37px] top-1 w-6 h-6 rounded-full border flex items-center justify-center ${badge.bg}`}
                  >
                    {badge.icon}
                  </div>

                  {/* Card Body */}
                  <div className="bg-[#080f21] border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h4 className={`text-xs sm:text-sm font-bold ${badge.titleColor}`}>
                        {ev.title}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {dateStr}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{ev.description}</p>

                    {ev.amount !== undefined && ev.amount > 0 && (
                      <div className="mt-2 text-xs font-mono font-bold text-emerald-400">
                        Total: {BrazilianPriceParser.formatBRL(ev.amount)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
