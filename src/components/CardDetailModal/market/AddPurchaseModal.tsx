import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Layers, Plus, Store, Tag, X } from 'lucide-react';
import { CardCondition, CardPurchase, CardVariant } from '../../../types';

interface AddPurchaseModalProps {
  cardName: string;
  initialVariant: CardVariant;
  initialCondition: CardCondition;
  initialQuantity?: number;
  suggestedPrice?: number | null;
  editingPurchase?: CardPurchase | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    quantity: number;
    pricePerCard: number;
    variant: CardVariant;
    condition: CardCondition;
    purchasedAt: string;
    seller?: string;
    notes?: string;
  }) => void;
}

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  cardName,
  initialVariant,
  initialCondition,
  initialQuantity = 1,
  suggestedPrice,
  editingPurchase,
  onClose,
  onSave,
}) => {
  const [quantity, setQuantity] = useState(
    editingPurchase?.quantity || Math.max(1, initialQuantity)
  );
  const [priceInput, setPriceInput] = useState(
    editingPurchase
      ? editingPurchase.pricePerCard.toFixed(2).replace('.', ',')
      : suggestedPrice && suggestedPrice > 0
      ? suggestedPrice.toFixed(2).replace('.', ',')
      : ''
  );
  const [variant, setVariant] = useState<CardVariant>(
    editingPurchase?.variant || initialVariant || 'normal'
  );
  const [condition, setCondition] = useState<CardCondition>(
    editingPurchase?.condition || initialCondition || 'near_mint'
  );
  const [purchasedAt, setPurchasedAt] = useState(
    editingPurchase?.purchasedAt || new Date().toISOString().slice(0, 10)
  );
  const [seller, setSeller] = useState(editingPurchase?.seller || '');
  const [notes, setNotes] = useState(editingPurchase?.notes || '');

  useEffect(() => {
    if (editingPurchase) {
      setQuantity(editingPurchase.quantity);
      setPriceInput(editingPurchase.pricePerCard.toFixed(2).replace('.', ','));
      setVariant(editingPurchase.variant);
      setCondition(editingPurchase.condition);
      setPurchasedAt(editingPurchase.purchasedAt || new Date().toISOString().slice(0, 10));
      setSeller(editingPurchase.seller || '');
      setNotes(editingPurchase.notes || '');
    }
  }, [editingPurchase]);

  const numericPrice = parseFloat(priceInput.replace(',', '.')) || 0;
  const totalPaid = numericPrice * quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericPrice <= 0) {
      alert('Por favor, informe um valor válido por carta.');
      return;
    }

    onSave({
      id: editingPurchase?.id,
      quantity,
      pricePerCard: numericPrice,
      variant,
      condition,
      purchasedAt,
      seller: seller.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            {editingPurchase ? 'Editar Aquisição' : 'Registrar Compra / Preço Pago'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">{cardName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Quantity & Price per Card */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Quantidade</label>
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Preço por carta (R$)</label>
              <input
                type="text"
                placeholder="Ex: 12,50"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Total preview */}
          {numericPrice > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-medium">Investimento total:</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                R$ {totalPaid.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {/* Variant & Condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Variante</label>
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value as CardVariant)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value="normal">Normal</option>
                <option value="holo">Holográfica (Holo)</option>
                <option value="reverse">Reversa (Reverse Holo)</option>
                <option value="cosmosHolo">Cosmos Holo</option>
                <option value="promo">Promo</option>
                <option value="stamped">Estampada (Stamped)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Condição</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as CardCondition)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              >
                <option value="mint">Impecável (Mint)</option>
                <option value="near_mint">Como Nova (Near Mint)</option>
                <option value="lightly_played">Pouco Jogada</option>
                <option value="moderately_played">Moderadamente Jogada</option>
                <option value="heavily_played">Bastante Jogada</option>
                <option value="damaged">Danificada</option>
              </select>
            </div>
          </div>

          {/* Date & Seller */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Data da Compra</label>
              <input
                type="date"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Loja / Vendedor (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Liga Pokémon / João"
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-300 block mb-1">Observações (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Peguei em troca, comprei booster"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              {editingPurchase ? 'Atualizar Compra' : 'Salvar Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
