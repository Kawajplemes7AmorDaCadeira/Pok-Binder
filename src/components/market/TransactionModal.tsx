import React, { useState } from 'react';
import { DollarSign, ShoppingCart, Tag, X } from 'lucide-react';
import { CardCondition, CardVariant, PokemonCard, TransactionType } from '../../types';
import { InvestmentService } from '../../services/investment/InvestmentService';
import { PriceService } from '../../services/pricing/PriceService';
import { BrazilianPriceParser } from '../../services/pricing/BrazilianPriceParser';

interface TransactionModalProps {
  card?: PokemonCard;
  variant?: CardVariant;
  type?: TransactionType;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  card,
  variant = 'normal',
  type = 'purchase',
  onClose,
  onSuccess,
}) => {
  const defaultMarketPrice = PriceService.getCardMarketPrice(card, variant);

  const [txType, setTxType] = useState<TransactionType>(type);
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>(variant);
  const [selectedCondition, setSelectedCondition] = useState<CardCondition>('near_mint');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<string>(defaultMarketPrice ? defaultMarketPrice.toFixed(2) : '10.00');
  const [buyerOrStore, setBuyerOrStore] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;

    const parsedPrice = BrazilianPriceParser.parseBrazilianCurrency(unitPrice).amount;

    if (txType === 'purchase') {
      InvestmentService.recordPurchase({
        cardId: card.id,
        cardName: card.name,
        setName: card.setName,
        variant: selectedVariant,
        condition: selectedCondition,
        quantity,
        unitPrice: parsedPrice,
        date,
        buyerOrStore,
        notes,
      });
      onSuccess(`Compra de ${quantity}x ${card.name} registrada com sucesso! 💰`);
    } else {
      InvestmentService.recordSale({
        cardId: card.id,
        cardName: card.name,
        setName: card.setName,
        variant: selectedVariant,
        condition: selectedCondition,
        quantity,
        unitPrice: parsedPrice,
        date,
        buyerOrStore,
        notes,
      });
      onSuccess(`Venda de ${quantity}x ${card.name} registrada com sucesso! 💸`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0b1329] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              txType === 'purchase'
                ? 'bg-blue-950/40 border-blue-500/30 text-blue-400'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
            }`}>
              {txType === 'purchase' ? <ShoppingCart className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {txType === 'purchase' ? 'Registrar Compra' : 'Registrar Venda'}
              </h3>
              <p className="text-xs text-slate-400">
                {card ? `${card.name} (${card.setName})` : 'Transação Financeira'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Type Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setTxType('purchase')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              txType === 'purchase'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛒 Compra (Investido)
          </button>
          <button
            type="button"
            onClick={() => setTxType('sale')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              txType === 'sale'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💰 Venda (Realizado)
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Variante</label>
              <select
                value={selectedVariant}
                onChange={(e) => setSelectedVariant(e.target.value as CardVariant)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              >
                <option value="normal">⚪ Normal</option>
                <option value="holo">✨ Holo Foil</option>
                <option value="reverse">🌟 Reversa</option>
                <option value="cosmosHolo">🌌 Cosmos</option>
                <option value="promo">⭐ Promo</option>
                <option value="stamped">🎖️ Stamped</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Condição</label>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value as CardCondition)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
              >
                <option value="mint">Mint (Perfeita)</option>
                <option value="near_mint">Near Mint (NM)</option>
                <option value="lightly_played">Lightly Played (LP)</option>
                <option value="moderately_played">Moderately Played (MP)</option>
                <option value="damaged">Damaged (DMG)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                max="999"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Valor Unitário (R$)
              </label>
              <input
                type="text"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Ex: 25.50"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-mono font-bold outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              {txType === 'purchase' ? 'Loja / Vendedor' : 'Comprador'}
            </label>
            <input
              type="text"
              value={buyerOrStore}
              onChange={(e) => setBuyerOrStore(e.target.value)}
              placeholder={txType === 'purchase' ? 'Ex: Epic Game Store, Bazar de Bagdá' : 'Ex: Amigo, Negociação Liga'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Data da Operação</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-98 text-white ${
                txType === 'purchase'
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {txType === 'purchase' ? 'Salvar Registro de Compra' : 'Salvar Registro de Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
