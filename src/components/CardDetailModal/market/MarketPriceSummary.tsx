import React from 'react';
import { ArrowDownRight, ArrowUpRight, DollarSign, Edit3, Minus, Wallet } from 'lucide-react';
import { InvestmentAnalysis } from '../../../types';
import { BrazilianPriceParser } from '../../../services/pricing/BrazilianPriceParser';

interface MarketPriceSummaryProps {
  investment: InvestmentAnalysis;
  isLoadingPrice?: boolean;
  onEditPaidPrice?: () => void;
}

export const MarketPriceSummary: React.FC<MarketPriceSummaryProps> = ({
  investment,
  isLoadingPrice = false,
  onEditPaidPrice,
}) => {
  const formatCurrency = BrazilianPriceParser.formatBRL;

  const hasPaid = investment.averagePricePaid > 0;
  const hasMarket = investment.currentMarketPrice !== null;
  const hasRoi = investment.roiPercentage !== null;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {/* 1. Preço Médio Pago (Clickable to set/edit price) */}
      <button
        onClick={onEditPaidPrice}
        className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between text-left transition-all group"
        title="Clique para registrar ou editar o preço pago"
      >
        <div className="flex items-center justify-between text-slate-400 w-full">
          <span className="text-[11px] font-bold uppercase tracking-wider">Pago</span>
          <div className="flex items-center gap-1">
            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity" />
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
          </div>
        </div>
        <div className="mt-2 w-full">
          <div className="text-base font-black text-white font-mono flex items-center justify-between">
            <span>{hasPaid ? formatCurrency(investment.averagePricePaid) : 'R$ ---'}</span>
          </div>
          <span className="text-[10px] text-blue-400 group-hover:underline font-medium block mt-0.5">
            {investment.totalQuantityBought > 0
              ? `${investment.totalQuantityBought} comprada(s) ✎`
              : 'Definir preço ✎'}
          </span>
        </div>
      </button>

      {/* 2. Preço de Mercado Atual */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Mercado</span>
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-2">
          <div className="text-base font-black text-white font-mono flex items-center gap-1.5">
            {isLoadingPrice ? (
              <span className="text-xs text-slate-400 animate-pulse">Buscando...</span>
            ) : hasMarket ? (
              formatCurrency(investment.currentMarketPrice)
            ) : (
              <span className="text-xs text-slate-400">Indisponível</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            Estimativa Mediana
          </span>
        </div>
      </div>

      {/* 3. Resultado Financeiro (Lucro/Prejuízo) */}
      <div
        className={`border rounded-2xl p-3.5 flex flex-col justify-between transition-colors ${
          investment.isProfit
            ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
            : investment.isLoss
            ? 'bg-red-950/30 border-red-800/50 text-red-400'
            : 'bg-slate-950/80 border-slate-800/80 text-slate-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider">Resultado</span>
          {investment.isProfit ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          ) : investment.isLoss ? (
            <ArrowDownRight className="w-4 h-4 text-red-400" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
        <div className="mt-2">
          <div className="text-base font-black font-mono flex items-center gap-1">
            {hasRoi ? (
              <>
                <span>{investment.isProfit ? '▲' : investment.isLoss ? '▼' : ''}</span>
                <span>
                  {investment.roiPercentage! >= 0 ? '+' : ''}
                  {investment.roiPercentage!.toFixed(1)}%
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400">---</span>
            )}
          </div>
          <span className="text-[10px] font-semibold block mt-0.5 truncate">
            {investment.totalProfitLoss !== null
              ? `${investment.totalProfitLoss >= 0 ? '+' : ''}${formatCurrency(
                  investment.totalProfitLoss
                )}`
              : 'Registre compras'}
          </span>
        </div>
      </div>
    </div>
  );
};
