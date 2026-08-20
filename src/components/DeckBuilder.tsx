import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Filter,
  Grid,
  Info,
  List,
  Plus,
  PlusCircle,
  Search,
  Share2,
  ShieldAlert,
  Sword,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { DeckValidator } from '../lib/deckValidator';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { CardLanguage, Deck, DeckCard, PokemonCard } from '../types';
import { CardImage } from './CardImage';
import { DeckVisualizer } from './DeckVisualizer';

interface DeckBuilderProps {
  preferredLanguage: CardLanguage;
  onSelectCard: (card: PokemonCard) => void;
  onNavigate?: (tab: any) => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  preferredLanguage,
  onSelectCard,
  onNavigate,
}) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string>('');
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnlyOwned, setFilterOnlyOwned] = useState(false);
  const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Deck cards metadata map
  const [cardMetadata, setCardMetadata] = useState<Record<string, PokemonCard>>({});

  // View Mode for Deck Cards: 'visual' | 'list'
  const [deckViewMode, setDeckViewMode] = useState<'visual' | 'list'>('visual');

  // Modals state
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [copiedExport, setCopiedExport] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);

  // Multi-version Selection state during import
  const [disambiguationList, setDisambiguationList] = useState<{
    originalLine: string;
    requestedQty: number;
    cardName: string;
    matches: PokemonCard[];
  } | null>(null);

  useEffect(() => {
    const loadedDecks = StorageService.getDecks();
    setDecks(loadedDecks);
    if (loadedDecks.length > 0) {
      setActiveDeckId(loadedDecks[0].id);
      setActiveDeck(loadedDecks[0]);
    }
  }, []);

  useEffect(() => {
    if (!activeDeckId) return;
    const found = decks.find((d) => d.id === activeDeckId);
    if (found) {
      setActiveDeck(found);
    }
  }, [activeDeckId, decks]);

  // Load Metadata for all cards inside current active deck
  useEffect(() => {
    if (!activeDeck) return;
    async function loadDeckCardMetadata() {
      const ids = activeDeck!.cards.map((c) => c.cardId);
      if (ids.length > 0) {
        const meta = await CardProvider.getCardsByIds(ids, preferredLanguage);
        setCardMetadata((prev) => ({ ...prev, ...meta }));
      }
    }
    loadDeckCardMetadata();
  }, [activeDeck, preferredLanguage]);

  // Handle Card Search in Left Column with Debounce
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await CardProvider.searchCards(
          { searchQuery, setId: searchQuery ? undefined : 'sv03.5' },
          preferredLanguage
        );

        if (!isMounted) return;

        let cards = res.cards;
        if (filterOnlyOwned) {
          const collection = StorageService.getCollection();
          const ownedIds = new Set(collection.map((i) => i.cardId));
          cards = cards.filter((c) => ownedIds.has(c.id));
        }

        setSearchResults(cards);

        // Cache metadata
        const newMeta: Record<string, PokemonCard> = {};
        cards.forEach((c) => (newMeta[c.id] = c));
        setCardMetadata((prev) => ({ ...prev, ...newMeta }));
      } finally {
        if (isMounted) setLoadingSearch(false);
      }
    }, searchQuery ? 250 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, filterOnlyOwned, preferredLanguage]);

  // Create new deck
  const handleCreateDeck = () => {
    const newDeck: Deck = {
      id: `deck_${Date.now()}`,
      name: `Novo Deck #${decks.length + 1}`,
      format: 'Standard',
      cards: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = StorageService.saveDeck(newDeck);
    setDecks(updated);
    setActiveDeckId(newDeck.id);
    setActiveDeck(newDeck);
  };

  // Modify quantity of a card in active deck
  const handleUpdateCardQuantityInDeck = (cardId: string, delta: number) => {
    if (!activeDeck) return;

    const cardsCopy = [...activeDeck.cards];
    const idx = cardsCopy.findIndex((c) => c.cardId === cardId);

    if (idx >= 0) {
      const newQty = cardsCopy[idx].quantity + delta;
      if (newQty <= 0) {
        cardsCopy.splice(idx, 1);
      } else {
        cardsCopy[idx].quantity = newQty;
      }
    } else if (delta > 0) {
      cardsCopy.push({ cardId, quantity: delta });
    }

    const updatedDeck: Deck = { ...activeDeck, cards: cardsCopy };
    const savedDecks = StorageService.saveDeck(updatedDeck);
    setDecks(savedDecks);
    setActiveDeck(updatedDeck);
  };

  const handleDeleteActiveDeck = () => {
    if (!activeDeck) return;
    setDeckToDelete(activeDeck);
  };

  const handleConfirmDeleteDeck = () => {
    if (!deckToDelete) return;
    const remaining = StorageService.deleteDeck(deckToDelete.id);
    setDecks(remaining);
    if (remaining.length > 0) {
      setActiveDeckId(remaining[0].id);
      setActiveDeck(remaining[0]);
    } else {
      setActiveDeckId('');
      setActiveDeck(null);
    }
    setDeckToDelete(null);
  };

  // Validation
  const validation = activeDeck ? DeckValidator.validate(activeDeck, cardMetadata) : null;

  // Calculate Collection vs Deck Requirements (CRITICAL REQUIREMENT)
  const collection = StorageService.getCollection();
  const ownedQuantityMap: Record<string, number> = {};
  collection.forEach((item) => {
    ownedQuantityMap[item.cardId] = (ownedQuantityMap[item.cardId] || 0) + item.quantity;
  });

  const missingFromCollectionList: { cardId: string; cardName: string; required: number; owned: number; missing: number }[] = [];

  if (activeDeck) {
    activeDeck.cards.forEach((dc) => {
      const meta = cardMetadata[dc.cardId];
      const owned = ownedQuantityMap[dc.cardId] || 0;
      const missing = Math.max(0, dc.quantity - owned);

      if (missing > 0) {
        missingFromCollectionList.push({
          cardId: dc.cardId,
          cardName: meta?.name || dc.cardId,
          required: dc.quantity,
          owned,
          missing,
        });
      }
    });
  }

  // Handle Export Text
  const handleExportText = () => {
    if (!activeDeck) return;
    let text = `DECK: ${activeDeck.name}\nFORMATO: ${activeDeck.format || 'Standard'}\n\n`;

    activeDeck.cards.forEach((dc) => {
      const meta = cardMetadata[dc.cardId];
      text += `${dc.quantity}x ${meta?.name || dc.cardId} (${meta?.setName || ''} #${meta?.localId || ''})\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  // Handle Import List Parsing
  const handleImportList = async () => {
    if (!importText.trim() || !activeDeck) return;

    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('//') || line.startsWith('#') || line.toUpperCase().startsWith('DECK:')) continue;

      const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
      if (match) {
        const qty = parseInt(match[1], 10);
        const cardQuery = match[2].trim();

        // Search for matching cards
        const searchRes = await CardProvider.searchCards({ searchQuery: cardQuery }, preferredLanguage);
        if (searchRes.cards.length === 1) {
          handleUpdateCardQuantityInDeck(searchRes.cards[0].id, qty);
        } else if (searchRes.cards.length > 1) {
          // Trigger Disambiguation Modal for user choice!
          setDisambiguationList({
            originalLine: line,
            requestedQty: qty,
            cardName: cardQuery,
            matches: searchRes.cards,
          });
          setShowImportModal(false);
          return;
        }
      }
    }

    setShowImportModal(false);
    setImportText('');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Sword className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Construtor de Decks</h1>
              <p className="text-xs text-slate-400">
                Monte, valide e compare seu deck com suas cartas físicas em posse
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCreateDeck}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Novo Deck
            </button>
          </div>
        </div>

        {/* Decks Visual Tabs Switcher */}
        {decks.length > 0 && (
          <div className="border-t border-slate-800/60 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Seus Decks Disponíveis
              </span>
              <span className="text-[10px] text-purple-400 font-bold">
                {decks.length} {decks.length === 1 ? 'deck criado' : 'decks criados'}
              </span>
            </div>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2">
              {decks.map((d) => {
                const isSelected = d.id === activeDeckId;
                const count = d.cards.reduce((s, c) => s + c.quantity, 0);
                
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setActiveDeckId(d.id);
                      setActiveDeck(d);
                    }}
                    className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all relative group cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600/10 border-purple-500 text-white shadow-lg shadow-purple-950/20 scale-[1.02]'
                        : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse' : 'bg-slate-800 group-hover:bg-slate-700'
                    }`}>
                      <div className="w-1 h-1 rounded-full bg-white" />
                    </div>
                    
                    <div className="text-left">
                      <span className="block truncate max-w-[120px] sm:max-w-[180px] font-extrabold text-white">
                        {d.name}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 block">
                        {count} de 60 cartas
                      </span>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      count === 60 
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50' 
                        : count > 60 
                          ? 'bg-red-950/60 text-red-400 border-red-900/50'
                          : 'bg-amber-950/60 text-amber-500 border-amber-900/50'
                    }`}>
                      {count === 60 ? '✓ Pronto' : `${count}/60`}
                    </span>

                    {/* Quick Delete Deck Button inside Tab */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeckToDelete(d);
                      }}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors ml-1"
                      title="Excluir este deck"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              <button
                onClick={handleCreateDeck}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-slate-500 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-950/10 text-xs font-black transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Criar Mais Um
              </button>
            </div>
          </div>
        )}
      </div>

      {!activeDeck ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-sm">
          Nenhum deck selecionado. Clique em "+ Novo Deck" para começar!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Catalog Search & Filter (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col h-[800px]">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Pesquisar Cartas para o Deck</span>
              <button
                onClick={() => setFilterOnlyOwned(!filterOnlyOwned)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                  filterOnlyOwned
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {filterOnlyOwned ? '✓ Apenas cartas que tenho' : '[ ] Apenas cartas que tenho'}
              </button>
            </h2>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: Pikachu, Charizard, Ultra Ball..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white"
              />
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingSearch ? (
                <div className="text-center py-8 text-xs text-slate-400">Buscando cartas...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">Nenhuma carta encontrada.</div>
              ) : (
                searchResults.map((card) => {
                  const owned = ownedQuantityMap[card.id] || 0;
                  return (
                    <div
                      key={card.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center gap-3 hover:border-purple-500 transition-colors"
                    >
                      <div className="w-12 h-16 flex-shrink-0">
                        <CardImage src={card.image} alt={card.name} card={card} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          onClick={() => onSelectCard(card)}
                          className="font-bold text-xs text-white truncate cursor-pointer hover:text-purple-400"
                        >
                          {card.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {card.setName} • #{card.localId}
                        </div>
                        <div className="text-[10px] font-bold mt-1">
                          Possuo: <span className={owned > 0 ? 'text-emerald-400' : 'text-slate-500'}>{owned}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUpdateCardQuantityInDeck(card.id, 1)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Deck
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Active Deck View & Validation (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Deck Details & Actions Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <input
                    type="text"
                    value={activeDeck.name}
                    onChange={(e) => {
                      const updated = { ...activeDeck, name: e.target.value };
                      setActiveDeck(updated);
                      StorageService.saveDeck(updated);
                    }}
                    className="bg-transparent border-b border-slate-700 text-xl font-black text-white focus:outline-none focus:border-purple-500 px-1 py-0.5"
                  />
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    Formato: {activeDeck.format || 'Standard'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportText}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Exportar como Texto"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    title="Importar Lista de Deck"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDeleteActiveDeck}
                    className="p-2 rounded-xl bg-red-950/60 text-red-400 hover:bg-red-900/80"
                    title="Excluir Deck"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('arena')}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-98 border border-red-500/20"
                >
                  <Sword className="w-4 h-4 fill-current animate-pulse" /> Testar este Deck na Arena de Simulação
                </button>
              )}

              {/* Stats Counters */}
              <div className="grid grid-cols-4 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL</span>
                  <span className="font-black text-white text-sm">{validation?.totalCards || 0} / 60</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">POKÉMON</span>
                  <span className="font-bold text-amber-400">{validation?.pokemonCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TREINADORES</span>
                  <span className="font-bold text-blue-400">{validation?.trainerCount || 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ENERGIAS</span>
                  <span className="font-bold text-emerald-400">{validation?.energyCount || 0}</span>
                </div>
              </div>

              {/* Validation Issues Alert Panel */}
              {validation && validation.issues.length > 0 && (
                <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-3.5 space-y-1.5">
                  <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Validação do DeckValidator:
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-amber-200">
                    {validation.issues.map((iss, i) => (
                      <li key={i}>{iss.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Cards Alert Banner */}
              <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-300 font-bold">Cartas no seu acervo físico: </span>
                  {missingFromCollectionList.length === 0 ? (
                    <span className="text-emerald-400 font-bold">✓ Você possui todas as cartas!</span>
                  ) : (
                    <span className="text-red-400 font-bold">
                      Faltam {missingFromCollectionList.reduce((s, i) => s + i.missing, 0)} cópias para montar
                    </span>
                  )}
                </div>

                {missingFromCollectionList.length > 0 && (
                  <button
                    onClick={() => setShowMissingModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                  >
                    Ver Faltantes
                  </button>
                )}
              </div>
            </div>

            {/* Deck Visualization Charts (Recharts) */}
            <DeckVisualizer 
              deckCards={activeDeck.cards} 
              cardMetadata={cardMetadata} 
              preferredLanguage={preferredLanguage}
              onAddCardToDeck={(cardId, qty) => handleUpdateCardQuantityInDeck(cardId, qty)}
            />

            {/* Deck Cards List View Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Cartas do Deck ({activeDeck.cards.length})</h3>

                <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
                  <button
                    onClick={() => setDeckViewMode('visual')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      deckViewMode === 'visual' ? 'bg-purple-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5 inline mr-1" /> Visual
                  </button>
                  <button
                    onClick={() => setDeckViewMode('list')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      deckViewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    <List className="w-3.5 h-3.5 inline mr-1" /> Lista
                  </button>
                </div>
              </div>

              {activeDeck.cards.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nenhuma carta no deck ainda. Use a busca ao lado para adicionar!
                </div>
              ) : deckViewMode === 'visual' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeDeck.cards.map((dc) => {
                    const card = cardMetadata[dc.cardId];
                    const owned = ownedQuantityMap[dc.cardId] || 0;
                    const isEnough = owned >= dc.quantity;

                    return (
                      <div
                        key={dc.cardId}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-2 space-y-2 flex flex-col justify-between"
                      >
                        <div className="aspect-[3/4] w-full rounded-xl overflow-hidden">
                          <CardImage src={card?.image} alt={card?.name || dc.cardId} card={card} />
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-bold text-white truncate">{card?.name || dc.cardId}</div>

                          {/* DECK X COLLECTION STATUS BADGE */}
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-400">Deck: {dc.quantity}</span>
                            {isEnough ? (
                              <span className="text-emerald-400 font-bold">✓ Completo ({owned})</span>
                            ) : (
                              <span className="text-red-400 font-bold">Falta {dc.quantity - owned}</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between bg-slate-900 rounded-lg p-1">
                            <button
                              onClick={() => handleUpdateCardQuantityInDeck(dc.cardId, -1)}
                              className="px-2 py-0.5 text-slate-300 font-bold hover:text-white"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-xs text-white">{dc.quantity}</span>
                            <button
                              onClick={() => handleUpdateCardQuantityInDeck(dc.cardId, 1)}
                              className="px-2 py-0.5 text-slate-300 font-bold hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {activeDeck.cards.map((dc) => {
                    const card = cardMetadata[dc.cardId];
                    const owned = ownedQuantityMap[dc.cardId] || 0;
                    const isEnough = owned >= dc.quantity;

                    return (
                      <div
                        key={dc.cardId}
                        className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-amber-400">{dc.quantity}x</span>
                          <span className="font-bold text-white">{card?.name || dc.cardId}</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className={`font-mono text-[11px] ${isEnough ? 'text-emerald-400' : 'text-red-400 font-bold'}`}>
                            Possuo: {owned} / {dc.quantity}
                          </span>

                          <div className="flex items-center bg-slate-900 rounded-lg p-0.5">
                            <button
                              onClick={() => handleUpdateCardQuantityInDeck(dc.cardId, -1)}
                              className="px-2 py-0.5 text-slate-300 hover:text-white"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono text-white">{dc.quantity}</span>
                            <button
                              onClick={() => handleUpdateCardQuantityInDeck(dc.cardId, 1)}
                              className="px-2 py-0.5 text-slate-300 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Missing Cards Modal */}
      {showMissingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Cartas que Faltam na Coleção</h3>
              <button onClick={() => setShowMissingModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {missingFromCollectionList.map((item) => (
                <div key={item.cardId} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl text-xs">
                  <span className="font-bold text-white">{item.cardName}</span>
                  <span className="font-mono text-red-400 font-bold">Falta {item.missing} (Tenho {item.owned})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Importar Lista de Deck</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <textarea
              rows={8}
              placeholder={`Cole a lista aqui, por exemplo:\n4 Pikachu\n3 Raichu\n4 Ultra Ball\n10 Lightning Energy`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none"
            />

            <button
              onClick={handleImportList}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              Processar Importação
            </button>
          </div>
        </div>
      )}

      {/* Multi-version Disambiguation Modal */}
      {disambiguationList && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Selecione a versão exata</h3>
            <p className="text-xs text-slate-400">
              Foram encontradas {disambiguationList.matches.length} versões de "{disambiguationList.cardName}". Escolha qual deseja adicionar ao deck:
            </p>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {disambiguationList.matches.map((matchCard) => (
                <div
                  key={matchCard.id}
                  onClick={() => {
                    handleUpdateCardQuantityInDeck(matchCard.id, disambiguationList.requestedQty);
                    setDisambiguationList(null);
                  }}
                  className="bg-slate-950 p-2 rounded-xl border border-slate-800 hover:border-purple-500 cursor-pointer space-y-1 text-center"
                >
                  <div className="aspect-[3/4] w-full">
                    <CardImage src={matchCard.image} alt={matchCard.name} card={matchCard} />
                  </div>
                  <div className="text-xs font-bold text-white truncate">{matchCard.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{matchCard.setName} #{matchCard.localId}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deckToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white">Excluir Deck?</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Você tem certeza que deseja excluir o deck <span className="font-bold text-white">"{deckToDelete.name}"</span>? Esta ação não pode ser desfeita e todas as informações dele serão apagadas do seu banco de dados local.
            </p>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeckToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteDeck}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-950/50"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
