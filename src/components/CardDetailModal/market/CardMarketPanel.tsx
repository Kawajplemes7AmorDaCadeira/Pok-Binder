import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Plus,
  Tag,
  Sparkles,
} from 'lucide-react';
import {
  AggregatedMarketPrice,
  CardCondition,
  CardPurchase,
  CardVariant,
  InvestmentAnalysis,
  PokemonCard,
} from '../../../types';
import { PurchaseRepository } from '../../../database/repositories/PurchaseRepository';
import { InvestmentService } from '../../../services/pricing/InvestmentService';
import { PriceService } from '../../../services/pricing/PriceService';
import { MarketPriceSummary } from './MarketPriceSummary';
import { InvestmentSummary } from './InvestmentSummary';
import { MarketSourceList } from './MarketSourceList';
import { PurchaseHistory } from './PurchaseHistory';
import { AddPurchaseModal } from './AddPurchaseModal';

interface CardMarketPanelProps {
  card: PokemonCard;
  selectedVariant: CardVariant;
  selectedCondition: CardCondition;
  currentOwnedQuantity: number;
  onCollectionUpdated?: () => void;
}

export const CardMarketPanel: React.FC<CardMarketPanelProps> = ({
  card,
  selectedVariant,
  selectedCondition,
  currentOwnedQuantity,
  onCollectionUpdated,
}) => {
  const [purchases, setPurchases] = useState<CardPurchase[]>([]);
  const [marketData, setMarketData] = useState<AggregatedMarketPrice | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<CardPurchase | null>(null);

  // Variant label for UI
  const getVariantLabel = (v: CardVariant) => {
    switch (v) {
      case 'holo':
        return 'Holo Foil';
      case 'reverse':
        return 'Reverse Holo';
      case 'cosmosHolo':
        return 'Cosmos Holo';
      case 'promo':
        return 'Promo';
      case 'stamped':
        return 'Stamped';
      case 'normal':
      default:
        return 'Normal';
    }
  };

  // 1. Load Purchases for this specific card
  const loadPurchases = async () => {
    const list = await PurchaseRepository.getByCardId(card.id);
    setPurchases(list);
  };

  useEffect(() => {
    loadPurchases();
  }, [card.id]);

  // 2. Load Market Price asynchronously for currently active variant & condition
  const loadMarketPrice = async (forceRefresh?: boolean) => {
    setIsLoadingPrice(true);
    try {
      const agg = PriceService.getAggregatedMarketPrice(
        card,
        selectedVariant,
        selectedCondition,
        'pt',
        Boolean(forceRefresh)
      );
      setMarketData(agg);
    } catch (e) {
      console.error('Failed to load market price', e);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  useEffect(() => {
    loadMarketPrice();
  }, [card.id, selectedVariant, selectedCondition]);

  // Filter purchases specifically for the active variant
  const variantPurchases = purchases.filter((p) => p.variant === selectedVariant);

  // Compute live investment metrics
  const investment: InvestmentAnalysis = InvestmentService.calculateInvestment(
    variantPurchases,
    marketData?.marketPrice ?? null,
    currentOwnedQuantity,
    selectedVariant
  );

  // Add / Edit purchase action
  const handleSavePurchase = async (data: {
    id?: string;
    quantity: number;
    pricePerCard: number;
    variant: CardVariant;
    condition: CardCondition;
    purchasedAt: string;
    seller?: string;
    notes?: string;
  }) => {
    if (data.id) {
      // Update existing purchase
      await PurchaseRepository.updatePurchase({
        id: data.id,
        cardId: card.id,
        variant: data.variant,
        condition: data.condition,
        quantity: data.quantity,
        pricePerCard: data.pricePerCard,
        totalPaid: data.pricePerCard * data.quantity,
        currency: 'BRL',
        purchasedAt: data.purchasedAt,
        seller: data.seller,
        notes: data.notes,
        createdAt: editingPurchase?.createdAt || new Date().toISOString(),
      });
    } else {
      // Add new purchase
      await PurchaseRepository.addPurchase({
        cardId: card.id,
        ...data,
        totalPaid: data.pricePerCard * data.quantity,
        currency: 'BRL',
      });
    }

    await loadPurchases();
    setShowAddPurchaseModal(false);
    setEditingPurchase(null);
    if (onCollectionUpdated) onCollectionUpdated();
  };

  // Open Edit Modal for a specific purchase
  const handleEditPurchase = (purchase: CardPurchase) => {
    setEditingPurchase(purchase);
    setShowAddPurchaseModal(true);
  };

  // Delete purchase action
  const handleDeletePurchase = async (id: string) => {
    await PurchaseRepository.deletePurchase(id);
    await loadPurchases();
    if (onCollectionUpdated) onCollectionUpdated();
  };

  // Quick Open Modal
  const handleOpenAdd = () => {
    setEditingPurchase(null);
    setShowAddPurchaseModal(true);
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              Mercado & Investimento
              <span
                className="text-slate-500 cursor-help"
                title="O valor de mercado é uma estimativa baseada nos preços encontrados nas fontes disponíveis e pode variar conforme condição, idioma, variante e vendedor."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </h3>
            <span className="text-[11px] font-semibold text-emerald-400">
              {getVariantLabel(selectedVariant)} •{' '}
              {selectedCondition === 'mint'
                ? 'Mint'
                : selectedCondition === 'near_mint'
                ? 'Near Mint'
                : 'Jogada'}
            </span>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="py-1.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Registrar Compra
        </button>
      </div>

      {/* Quick Price Banner for cards that were already saved in collection */}
      {currentOwnedQuantity > 0 && variantPurchases.length === 0 && (
        <div className="bg-gradient-to-r from-blue-950/60 to-slate-900/80 border border-blue-800/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Você possui {currentOwnedQuantity} cópia(s) {getVariantLabel(selectedVariant)} salva(s)
            </span>
            <p className="text-[11px] text-slate-400">
              Defina quanto pagou por elas para calcular seu lucro ou valorização da coleção.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
          >
            Definir Preço Pago
          </button>
        </div>
      )}

      {/* 3 Metric Cards: Pago (Clickable to Edit) | Mercado | Resultado */}
      <MarketPriceSummary
        investment={investment}
        isLoadingPrice={isLoadingPrice}
        onEditPaidPrice={
          variantPurchases.length > 0
            ? () => handleEditPurchase(variantPurchases[0])
            : handleOpenAdd
        }
      />

      {/* Current Position in Collection */}
      <InvestmentSummary
        investment={investment}
        variantLabel={getVariantLabel(selectedVariant)}
      />

      {/* Market Sources List (Liga Pokémon, MYPCards, Mediana) */}
      <MarketSourceList
        card={card}
        marketData={marketData}
        isLoading={isLoadingPrice}
        onRefresh={() => loadMarketPrice(true)}
        variantLabel={getVariantLabel(selectedVariant)}
        selectedVariant={selectedVariant}
        selectedCondition={selectedCondition}
        onMarketUpdated={() => loadMarketPrice(true)}
      />

      {/* Purchase Acquisition History with Edit & Delete */}
      <PurchaseHistory
        purchases={variantPurchases}
        onOpenAddModal={handleOpenAdd}
        onEditPurchase={handleEditPurchase}
        onDeletePurchase={handleDeletePurchase}
        variantLabel={getVariantLabel(selectedVariant)}
      />

      {/* Add / Edit Purchase Dialog Modal */}
      {showAddPurchaseModal && (
        <AddPurchaseModal
          cardName={card.name}
          initialVariant={selectedVariant}
          initialCondition={selectedCondition}
          initialQuantity={currentOwnedQuantity || 1}
          suggestedPrice={marketData?.marketPrice}
          editingPurchase={editingPurchase}
          onClose={() => {
            setShowAddPurchaseModal(false);
            setEditingPurchase(null);
          }}
          onSave={handleSavePurchase}
        />
      )}
    </div>
  );
};
