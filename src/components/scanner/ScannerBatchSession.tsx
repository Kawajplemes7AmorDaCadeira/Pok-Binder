import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  History,
  Layers,
  Sparkles,
  TrendingUp,
  Undo2,
  X,
} from 'lucide-react';
import { ScanHistoryEntry, SessionStats } from '../../services/scanner/types';

interface ScannerBatchSessionProps {
  entries: ScanHistoryEntry[];
  stats: SessionStats;
  onUndoLast: () => void;
  isSummaryOpen: boolean;
  onCloseSummary: () => void;
}

export const ScannerBatchSession: React.FC<ScannerBatchSessionProps> = ({
  entries,
  stats,
  onUndoLast,
  isSummaryOpen,
  onCloseSummary,
}) => {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const confirmedCount = entries.filter((e) => e.status === 'CONFIRMED').length;

  return (
    <>
      {/* Session Tracker Floating Bar (shown when at least 1 card added) */}
      {confirmedCount > 0 && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs z-20 backdrop-blur-md">
          <button
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="flex items-center gap-2 text-slate-300 hover:text-white font-bold transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center text-[10px] text-red-400 font-black">
              {confirmedCount}
            </div>
            <span>
              Sessão Atual: <strong>{confirmedCount}</strong> carta(s) adicionada(s)
            </span>
            {isHistoryExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          <button
            onClick={onUndoLast}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-400 border border-slate-700 text-[11px] font-bold transition-all active:scale-95"
            title="Desfazer última adição da sessão"
          >
            <Undo2 className="w-3.5 h-3.5" /> Desfazer Última
          </button>
        </div>
      )}

      {/* Expanded Session Card History Drawer */}
      {isHistoryExpanded && confirmedCount > 0 && (
        <div className="bg-[#0b1329] border-b border-slate-800 p-4 max-h-48 overflow-y-auto space-y-2 text-xs z-20 animate-fadeIn shadow-2xl">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Histórico da Sessão
            </span>
            <span className="text-[11px] text-slate-400">
              Média de confiança: <strong>{stats.averageConfidence}%</strong>
            </span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {entries.map((entry) => (
              <div key={entry.id} className="py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white font-bold truncate">
                      {entry.cardName || 'Carta Pokémon'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {entry.setName} • #{entry.collectorNumber} ({entry.variant})
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-300">
                    +{entry.quantity || 1}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {entry.confidence}% conf.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Summary Completion Modal */}
      {isSummaryOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-slideUp text-center">
            {/* Header Icon */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-600/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <div>
              <h3 className="text-white text-lg font-black tracking-wide">
                ESCANEAMENTO CONCLUÍDO
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Resumo das cartas cadastradas nesta sessão do PokéBinder
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-bold block">Adicionadas</span>
                <span className="text-xl font-black text-emerald-400">
                  {stats.confirmedCount} cartas
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-bold block">
                  Duplicatas +1
                </span>
                <span className="text-xl font-black text-blue-400">
                  {stats.duplicateIncrementedCount}
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-bold block">
                  Média de Confiança
                </span>
                <span className="text-xl font-black text-amber-400">
                  {stats.averageConfidence}%
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-bold block">Desfeitas</span>
                <span className="text-xl font-black text-slate-400">
                  {stats.undoneCount}
                </span>
              </div>
            </div>

            {/* Close / Return Button */}
            <button
              onClick={onCloseSummary}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-sm shadow-xl shadow-red-600/30 transition-all active:scale-95"
            >
              Concluir e Voltar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
