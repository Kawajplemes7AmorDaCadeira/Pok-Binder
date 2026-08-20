import React from 'react';
import { Layers, PieChart } from 'lucide-react';
import { InvestmentAnalysis } from '../../../types';
import { BrazilianPriceParser } from '../../../services/pricing/BrazilianPriceParser';

interface InvestmentSummaryProps {
  investment: InvestmentAnalysis;
  variantLabel: string;
}

export const InvestmentSummary: React.FC<InvestmentSummaryProps> = ({
  investment,
  variantLabel,
}) => {
  const formatCurrency = BrazilianPriceParser.formatBRL;

  return (
    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-purple-400" />
          Posição na Coleção ({variantLabel})
        </span>
        <span className="text-xs font-mono font-bold text-purple-300">
          {investment.currentOwnedQuantity} em posse
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
        {/* Total Investido */}
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Investido</span>
          <span className="font-mono font-bold text-slate-200 text-sm mt-0.5 block">
            {formatCurrency(investment.totalInvested)}
          </span>
        </div>

        {/* Valor Atual Estimado */}
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Valor Estimado
          </span>
          <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
            {investment.currentEstimatedValue !== null
              ? formatCurrency(investment.currentEstimatedValue)
              : '---'}
          </span>
        </div>

        {/* Lucro/Prejuízo Líquido */}
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Resultado Total
          </span>
          <span
            className={`font-mono font-bold text-sm mt-0.5 block ${
              investment.isProfit
                ? 'text-emerald-400'
                : investment.isLoss
                ? 'text-red-400'
                : 'text-slate-400'
            }`}
          >
            {investment.totalProfitLoss !== null ? (
              <>
                {investment.totalProfitLoss >= 0 ? '+' : ''}
                {formatCurrency(investment.totalProfitLoss)}
              </>
            ) : (
              '---'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
