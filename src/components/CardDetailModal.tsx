import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Heart,
  Maximize2,
  Minus,
  Plus,
  ShieldAlert,
  Sparkles,
  Sword,
  X,
} from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { DeckValidator } from '../lib/deckValidator';
import {
  CardCondition,
  CardLanguage,
  CardVariant,
  Deck,
  PokemonCard,
} from '../types';
import { CardImage } from './CardImage';
import { CardMarketPanel } from './CardDetailModal/market/CardMarketPanel';
import { getRarityDisplay } from './tcg/TCGCollectionCard';
import { TransactionModal } from './market/TransactionModal';
import { PriceService } from '../services/pricing/PriceService';
import { Bookmark, DollarSign } from 'lucide-react';

interface CardDetailModalProps {
  card: PokemonCard | null;
  initialVariant?: CardVariant;
  onClose: () => void;
  preferredLanguage: CardLanguage;
  onCollectionUpdated?: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card: initialCard,
  initialVariant,
  onClose,
  preferredLanguage,
  onCollectionUpdated,
}) => {
  const [fullCard, setFullCard] = useState<PokemonCard | null>(initialCard);
  const [loading, setLoading] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Collection State for this card
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>(initialVariant || 'normal');
  const [selectedCondition, setSelectedCondition] = useState<CardCondition>('near_mint');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [decksUsingCard, setDecksUsingCard] = useState<Deck[]>([]);
  const [variantsBreakdown, setVariantsBreakdown] = useState<
    { variant: CardVariant; quantity: number; condition: CardCondition }[]
  >([]);

  useEffect(() => {
    if (!initialCard) return;

    async function loadDetails() {
      setLoading(true);
      const detailed = await CardProvider.getCardById(initialCard.id, preferredLanguage);
      setFullCard(detailed || initialCard);

      // Load collection status & breakdown
      const total = StorageService.getCardTotalQuantity(initialCard.id);
      const breakdown = StorageService.getCardVariantsBreakdown(initialCard.id);
      setTotalQuantity(total);
      setVariantsBreakdown(breakdown);
      setIsFavorite(StorageService.isFavorite(initialCard.id));
      setIsWishlisted(StorageService.isInWishlist(initialCard.id));

      // Determine smart initial variant
      let defaultVariant: CardVariant = 'normal';
      if (initialVariant) {
        defaultVariant = initialVariant;
      } else if (breakdown.length > 0) {
        defaultVariant = breakdown[0].variant;
      } else {
        const r = ((detailed || initialCard).rarity || '').toLowerCase();
        if (
          r.includes('holo') ||
          r.includes('ultra') ||
          r.includes('secret') ||
          r.includes('hyper') ||
          r.includes('illustration') ||
          r.includes('ex') ||
          r.includes('rare')
        ) {
          defaultVariant = 'holo';
        }
      }
      setSelectedVariant(defaultVariant);

      // Find decks using card
      const allDecks = StorageService.getDecks();
      const matchingDecks = allDecks.filter((d) =>
        d.cards.some((c) => c.cardId === initialCard.id)
      );
      setDecksUsingCard(matchingDecks);

      setLoading(false);
    }

    loadDetails();
  }, [initialCard, initialVariant, preferredLanguage]);

  if (!initialCard || !fullCard) return null;

  const refreshCollectionState = () => {
    const newTotal = StorageService.getCardTotalQuantity(fullCard.id);
    const newBreakdown = StorageService.getCardVariantsBreakdown(fullCard.id);
    setTotalQuantity(newTotal);
    setVariantsBreakdown(newBreakdown);
    if (onCollectionUpdated) onCollectionUpdated();
  };

  const handleUpdateQuantity = (delta: number) => {
    StorageService.updateCardQuantity(
      fullCard.id,
      delta,
      selectedVariant,
      preferredLanguage,
      selectedCondition
    );
    refreshCollectionState();
  };

  const handleConvertVariant = (fromVariant: CardVariant, toVariant: CardVariant) => {
    StorageService.convertCardVariant(fullCard.id, fromVariant, toVariant);
    refreshCollectionState();
  };

  const currentVariantQuantity = StorageService.getCardVariantQuantity(
    fullCard.id,
    selectedVariant
  );

  const handleToggleFavorite = () => {
    StorageService.toggleFavorite(fullCard.id);
    setIsFavorite(!isFavorite);
  };

  const isPt = preferredLanguage === 'pt';
  const rarityInfo = getRarityDisplay(fullCard.rarity);

  const variantsList: { key: CardVariant; label: string }[] = isPt ? [
    { key: 'normal', label: 'Normal' },
    { key: 'holo', label: 'Holo' },
    { key: 'reverse', label: 'Reversa' },
    { key: 'cosmosHolo', label: 'Cosmos' },
    { key: 'promo', label: 'Promo' },
    { key: 'stamped', label: 'Estampada' },
  ] : [
    { key: 'normal', label: 'Normal' },
    { key: 'holo', label: 'Holo' },
    { key: 'reverse', label: 'Reverse' },
    { key: 'cosmosHolo', label: 'Cosmos' },
    { key: 'promo', label: 'Promo' },
    { key: 'stamped', label: 'Stamped' },
  ];

  const conditionsList: { key: CardCondition; label: string }[] = isPt ? [
    { key: 'mint', label: 'Impecável (Mint)' },
    { key: 'near_mint', label: 'Como Nova (Near Mint)' },
    { key: 'lightly_played', label: 'Pouco Jogada' },
    { key: 'moderately_played', label: 'Moderadamente Jogada' },
    { key: 'heavily_played', label: 'Bastante Jogada' },
    { key: 'damaged', label: 'Danificada' },
  ] : [
    { key: 'mint', label: 'Mint' },
    { key: 'near_mint', label: 'Near Mint' },
    { key: 'lightly_played', label: 'Lightly Played' },
    { key: 'moderately_played', label: 'Moderately Played' },
    { key: 'heavily_played', label: 'Heavily Played' },
    { key: 'damaged', label: 'Damaged' },
  ];

  return (
    <>
      {/* Main Detail Modal / Mobile Bottom Sheet */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-[#0b1329] border-t sm:border border-slate-800/90 rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row transition-all duration-300">
          
          {/* Mobile Bottom Sheet Grabber Handle */}
          <div className="flex sm:hidden w-full justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-slate-700" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-md"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left Column: High Res Image with Zoom Trigger & Variant Visualizer */}
          <div className="md:w-5/12 bg-[#060b17] p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800/80 relative">
            <div className="relative w-full max-w-xs aspect-[3/4] group">
              <CardImage
                src={fullCard.imageHighRes || fullCard.image}
                alt={fullCard.name}
                rarity={fullCard.rarity}
                card={fullCard}
                variant={selectedVariant}
                showVariantBadge={true}
                className="w-full h-full shadow-2xl"
              />
              <button
                onClick={() => setZoomOpen(true)}
                className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs gap-2 transition-opacity backdrop-blur-xs rounded-2xl z-20"
              >
                <Maximize2 className="w-5 h-5" />
                Zoom 3D Holográfico
              </button>
            </div>

            {/* Quick Visual Variant Selector Buttons */}
            <div className="w-full max-w-xs mt-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Efeito Visual da Variante:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {selectedVariant === 'reverse'
                    ? '🌟 Reversa'
                    : selectedVariant === 'holo'
                    ? '✨ Holo Foil'
                    : selectedVariant === 'cosmosHolo'
                    ? '🌌 Cosmos'
                    : selectedVariant === 'promo'
                    ? '⭐ Promo'
                    : selectedVariant === 'stamped'
                    ? '🎖️ Estampada'
                    : '⚪ Normal'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {variantsList.map((v) => {
                  const isSelected = selectedVariant === v.key;
                  return (
                    <button
                      key={v.key}
                      onClick={() => setSelectedVariant(v.key)}
                      className={`py-1.5 px-1.5 rounded-lg font-bold border transition-all text-center truncate ${
                        isSelected
                          ? v.key === 'reverse'
                            ? 'bg-pink-600/30 border-pink-500 text-pink-300 shadow-sm shadow-pink-600/30'
                            : v.key === 'holo'
                            ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-sm shadow-purple-600/30'
                            : 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-600/30'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Tag notice */}
            {fullCard.language !== preferredLanguage && (
              <div className="mt-3 text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Exibindo em {fullCard.language.toUpperCase()} (Português indisponível)
              </div>
            )}
          </div>

          {/* Right Column: Card Details & Collection Controls */}
          <div className="md:w-7/12 p-6 overflow-y-auto space-y-6">
            {/* Header Title & Favorite */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-white">{fullCard.name}</h2>
                  {fullCard.hp && (
                    <span className="text-sm font-black text-red-500 font-mono">
                      {fullCard.hp} HP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                  <span className="text-slate-300">{fullCard.setName}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">#{fullCard.localId} / {fullCard.setTotalCards || '???'}</span>
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${rarityInfo.colorClass}`}>
                    {rarityInfo.icon} {rarityInfo.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isWishlisted) {
                      StorageService.removeFromWishlist(fullCard.id, selectedVariant);
                      setIsWishlisted(false);
                    } else {
                      const price = PriceService.getCardMarketPrice(fullCard, selectedVariant, selectedCondition);
                      StorageService.addToWishlist({
                        cardId: fullCard.id,
                        cardName: fullCard.name,
                        setName: fullCard.setName,
                        image: fullCard.image,
                        variant: selectedVariant,
                        targetPrice: Number((price * 0.85).toFixed(2)),
                        priority: 'media',
                      });
                      setIsWishlisted(true);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all active:scale-90 ${
                    isWishlisted
                      ? 'bg-pink-950/60 border-pink-500/50 text-pink-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={isWishlisted ? 'Remover da Wishlist' : 'Adicionar à Wishlist'}
                >
                  <Bookmark className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => setIsTxModalOpen(true)}
                  className="p-3.5 rounded-2xl border bg-slate-800/80 border-slate-700 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/50 transition-all active:scale-90"
                  title="Registrar Compra ou Venda"
                >
                  <DollarSign className="w-5 h-5" />
                </button>

                <button
                  onClick={handleToggleFavorite}
                  className="p-3.5 rounded-2xl border bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white transition-all active:scale-90"
                  style={{
                    backgroundColor: isFavorite ? 'rgba(239, 68, 68, 0.2)' : undefined,
                    borderColor: isFavorite ? '#ef4444' : undefined,
                    color: isFavorite ? '#ef4444' : undefined,
                  }}
                  title="Favoritar Carta"
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Quick Collection Controls */}
            <div className="bg-[#080f21] p-4 sm:p-5 rounded-2xl border border-slate-800/90 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Status no Fichário
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                    {currentVariantQuantity > 0
                      ? `✓ ${currentVariantQuantity} ${
                          selectedVariant === 'holo'
                            ? 'Holo'
                            : selectedVariant === 'reverse'
                            ? 'Reversa'
                            : selectedVariant === 'cosmosHolo'
                            ? 'Cosmos'
                            : selectedVariant === 'promo'
                            ? 'Promo'
                            : 'Normal'
                        } em posse`
                      : totalQuantity > 0
                      ? `0 ${selectedVariant} (${totalQuantity} em outras variantes)`
                      : 'Não cadastrada'}
                  </span>
                </div>
              </div>

              {/* Stepper Controls */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
                  <button
                    onClick={() => handleUpdateQuantity(-1)}
                    disabled={currentVariantQuantity <= 0}
                    className="p-3 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-900 transition-colors"
                    title={`Remover 1 cópia ${selectedVariant}`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-mono font-black text-white text-base">
                    {currentVariantQuantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(1)}
                    className="p-3 text-slate-300 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-900 transition-colors"
                    title={`Adicionar 1 cópia ${selectedVariant}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleUpdateQuantity(1)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-red-600/20 active:scale-98"
                >
                  + Adicionar {selectedVariant === 'holo' ? 'Holo' : selectedVariant === 'reverse' ? 'Reversa' : 'Cópia'}
                </button>
              </div>

              {/* 1-Click Variant Switcher Banner */}
              {currentVariantQuantity === 0 && variantsBreakdown.length > 0 && (
                <div className="bg-amber-950/40 border border-amber-800/40 p-3 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-200">
                    Sua carta está cadastrada como{' '}
                    <strong className="text-amber-400 uppercase font-black">
                      {variantsBreakdown[0].variant}
                    </strong>
                    . Deseja converter para{' '}
                    <strong className="text-emerald-400 uppercase font-black">
                      {selectedVariant}
                    </strong>
                    ?
                  </span>
                  <button
                    onClick={() =>
                      handleConvertVariant(variantsBreakdown[0].variant, selectedVariant)
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-black text-[11px] shrink-0 transition-colors shadow-sm"
                  >
                    Converter ⇄
                  </button>
                </div>
              )}

              {/* Variant & Condition Selectors */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Variante Selecionada
                  </label>
                  <select
                    value={selectedVariant}
                    onChange={(e) => setSelectedVariant(e.target.value as CardVariant)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-semibold outline-none focus:border-red-500/50"
                  >
                    {variantsList.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Estado de Conservação
                  </label>
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value as CardCondition)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-semibold outline-none focus:border-red-500/50"
                  >
                    {conditionsList.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mercado & Investimento */}
            <CardMarketPanel
              card={fullCard}
              selectedVariant={selectedVariant}
              selectedCondition={selectedCondition}
              currentOwnedQuantity={currentVariantQuantity}
              onCollectionUpdated={refreshCollectionState}
            />

            {/* Attacks & Rules */}
            {fullCard.attacks && fullCard.attacks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Ataques
                </h3>
                <div className="space-y-2">
                  {fullCard.attacks.map((atk, idx) => (
                    <div
                      key={idx}
                      className="bg-[#080f21] p-3 rounded-xl border border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{atk.name}</span>
                        {atk.damage && (
                          <span className="font-black text-red-400 font-mono text-sm">
                            {atk.damage}
                          </span>
                        )}
                      </div>
                      {atk.effect && (
                        <p className="text-xs text-slate-300 leading-relaxed">{atk.effect}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#080f21] p-4 rounded-xl border border-slate-800/90">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Artista</span>
                <span className="font-semibold text-slate-200">{fullCard.illustrator || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold font-sans">Formato / Rotação</span>
                <span className="font-semibold text-slate-200 flex flex-col gap-1 mt-0.5">
                  <span className="text-xs">{fullCard.regulationMark || (fullCard.setId?.toLowerCase().startsWith('sv') ? 'Série SV' : 'N/A')}</span>
                  {DeckValidator.isStandardLegal(fullCard) ? (
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15 w-max font-sans">Padrão Rotação ✓</span>
                  ) : (
                    <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/15 w-max font-sans">Apenas Expandido ⚠️</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Categoria</span>
                <span className="font-semibold text-slate-200">{fullCard.category || 'Pokémon'}</span>
              </div>
            </div>

            {/* Decks Usage */}
            {decksUsingCard.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sword className="w-3.5 h-3.5" />
                  Em Uso nos Decks:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {decksUsingCard.map((d) => (
                    <span
                      key={d.id}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60 text-purple-200 font-semibold text-xs"
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High-Res Fullscreen Zoom Modal */}
      {zoomOpen && (
        <div
          onClick={() => setZoomOpen(false)}
          className="fixed inset-0 z-60 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full aspect-[3/4] max-h-[90vh] shadow-2xl"
          >
            <CardImage
              src={fullCard.imageHighRes || fullCard.image}
              alt={fullCard.name}
              rarity={fullCard.rarity}
              card={fullCard}
              variant={selectedVariant}
              showVariantBadge={true}
              className="w-full h-full"
            />
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute -top-3 -right-3 bg-slate-900 text-white p-2.5 rounded-full border border-slate-700 shadow-xl z-30 hover:bg-slate-850 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Transaction Logging Modal */}
      {isTxModalOpen && (
        <TransactionModal
          card={fullCard}
          variant={selectedVariant}
          onClose={() => setIsTxModalOpen(false)}
          onSuccess={(msg) => {
            refreshCollectionState();
          }}
        />
      )}
    </>
  );
};
