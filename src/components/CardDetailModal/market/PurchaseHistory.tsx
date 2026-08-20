import React from 'react';
import { Calendar, Edit2, History, Plus, Store, Trash2 } from 'lucide-react';
import { CardPurchase } from '../../../types';
import { BrazilianPriceParser } from '../../../services/pricing/BrazilianPriceParser';

interface PurchaseHistoryProps {
  purchases: CardPurchase[];
  onOpenAddModal: () => void;
  onEditPurchase: (purchase: CardPurchase) => void;
  onDeletePurchase: (id: string) => void;
  variantLabel: string;
}

export const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({
  purchases,
  onOpenAddModal,
  onEditPurchase,
  onDeletePurchase,
  variantLabel,
}) => {
  const formatCurrency = BrazilianPriceParser.formatBRL;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Data não informada';
    try {
      const parts = isoStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(isoStr).toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <History className="w-4 h-4 text-blue-400" />
          Histórico de Aquisições ({variantLabel})
        </span>

        <button
          onClick={onOpenAddModal}
          className="py-1 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Registrar Compra
        </button>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-4 text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
          Nenhuma compra registrada para esta variante.
          <button
            onClick={onOpenAddModal}
            className="block mx-auto mt-2 text-blue-400 hover:underline font-semibold text-xs"
          >
            + Adicionar preço de compra
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {purchases.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                    {item.quantity}x
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {formatCurrency(item.pricePerCard)} cada
                  </span>
                  {item.quantity > 1 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Total: {formatCurrency(item.totalPaid)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {formatDate(item.purchasedAt)}
                  </span>
                  {item.seller && (
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3 text-slate-500" />
                      {item.seller}
                    </span>
                  )}
                  {item.notes && (
                    <span className="text-slate-500 truncate max-w-[120px]">• {item.notes}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEditPurchase(item)}
                  className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Editar dados desta compra"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeletePurchase(item.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-colors"
                  title="Remover registro de compra"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
