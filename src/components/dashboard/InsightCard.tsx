import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Flame,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { InsightItem } from '../../services/analytics/CollectionAnalyticsService';

interface InsightCardProps {
  insight: InsightItem;
  onActionClick?: (target: string) => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onActionClick }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'expansion_progress':
        return <Layers className="w-5 h-5 text-amber-400" />;
      case 'duplicates':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'deck_conflict':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'top_value':
        return <Flame className="w-5 h-5 text-emerald-400" />;
      default:
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (insight.type) {
      case 'expansion_progress':
        return 'hover:border-amber-500/50';
      case 'duplicates':
        return 'hover:border-purple-500/50';
      case 'deck_conflict':
        return 'hover:border-rose-500/50';
      case 'top_value':
        return 'hover:border-emerald-500/50';
      default:
        return 'hover:border-blue-500/50';
    }
  };

  return (
    <div
      className={`bg-[#080f21] border border-slate-800/90 ${getBorderColor()} rounded-2xl p-4 flex flex-col justify-between transition-all group`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              {getIcon()}
            </div>
            <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
              {insight.title}
            </h4>
          </div>

          {insight.badge && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
              {insight.badge}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed pl-1">
          {insight.description}
        </p>
      </div>

      {insight.actionLabel && insight.actionTarget && onActionClick && (
        <button
          onClick={() => onActionClick(insight.actionTarget!)}
          className="mt-3 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition-all"
        >
          <span>{insight.actionLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
};
