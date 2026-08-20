import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Sector,
} from 'recharts';
import {
  BarChart3,
  Zap,
  Layers,
  Sparkles,
  Calculator,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Swords,
  ShoppingBag,
  PlusCircle,
  Flame,
  Activity,
  Shield,
  Plus,
  Trash2,
  Shuffle,
  ArrowUpCircle,
  Play,
  Skull,
} from 'lucide-react';
import { CardLanguage, DeckCard, PokemonCard } from '../types';
import { StorageService } from '../services/storage';
import { CardProvider } from '../services/cardProvider';

interface DeckVisualizerProps {
  deckCards: DeckCard[];
  cardMetadata: Record<string, PokemonCard>;
  preferredLanguage?: CardLanguage;
  onAddCardToDeck?: (cardId: string, quantity: number) => void;
}

// Color map for Elemental Types
const TYPE_COLORS: Record<string, { bg: string; text: string; fill: string; ptName: string; symbol: string }> = {
  Fire: { bg: 'bg-red-500/20', text: 'text-red-400', fill: '#EF4444', ptName: 'Fogo', symbol: '🔥' },
  Water: { bg: 'bg-blue-500/20', text: 'text-blue-400', fill: '#3B82F6', ptName: 'Água', symbol: '💧' },
  Grass: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', fill: '#10B981', ptName: 'Planta', symbol: '🌿' },
  Lightning: { bg: 'bg-amber-500/20', text: 'text-amber-400', fill: '#F59E0B', ptName: 'Elétrico', symbol: '⚡' },
  Psychic: { bg: 'bg-purple-500/20', text: 'text-purple-400', fill: '#A855F7', ptName: 'Psíquico', symbol: '🔮' },
  Darkness: { bg: 'bg-slate-700/40', text: 'text-slate-300', fill: '#475569', ptName: 'Escuridão', symbol: '🌙' },
  Fighting: { bg: 'bg-orange-500/20', text: 'text-orange-400', fill: '#F97316', ptName: 'Luta', symbol: '✊' },
  Metal: { bg: 'bg-zinc-500/20', text: 'text-zinc-300', fill: '#71717A', ptName: 'Metal', symbol: '⚙️' },
  Dragon: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', fill: '#6366F1', ptName: 'Dragão', symbol: '🐉' },
  Colorless: { bg: 'bg-stone-500/20', text: 'text-stone-300', fill: '#A1A1AA', ptName: 'Incolor', symbol: '⚪' },
  Fairy: { bg: 'bg-pink-500/20', text: 'text-pink-400', fill: '#EC4899', ptName: 'Fada', symbol: '🌸' },
  Other: { bg: 'bg-gray-500/20', text: 'text-gray-400', fill: '#6B7280', ptName: 'Outros', symbol: '✨' },
};

// Category colors
const CATEGORY_COLORS: Record<string, { fill: string; ptName: string }> = {
  Pokemon: { fill: '#F59E0B', ptName: 'Pokémon' },
  Trainer: { fill: '#3B82F6', ptName: 'Treinadores' },
  Energy: { fill: '#10B981', ptName: 'Energias' },
  Other: { fill: '#8B5CF6', ptName: 'Outros' },
};

// Math: Combinations (n choose k)
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n / 2) k = n - k;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = (res * (n - k + i)) / i;
  }
  return res;
}

// Math: Hypergeometric starting hand probability
function getDrawingProbability(deckSize: number, cardQty: number, handSize: number): number {
  if (deckSize <= 0 || cardQty <= 0 || handSize <= 0 || handSize > deckSize) return 0;
  const waysToDrawZero = choose(deckSize - cardQty, handSize);
  const totalWays = choose(deckSize, handSize);
  if (totalWays === 0) return 0;
  const probZero = waysToDrawZero / totalWays;
  return Math.min(1, Math.max(0, 1 - probZero));
}

export const DeckVisualizer: React.FC<DeckVisualizerProps> = ({
  deckCards,
  cardMetadata,
  preferredLanguage = 'pt',
  onAddCardToDeck,
}) => {
  const [activeTab, setActiveTab] = useState<'charts' | 'assistant' | 'simulator'>('charts');
  const [collectionMetadata, setCollectionMetadata] = useState<Record<string, PokemonCard>>({});
  const [loadingCollection, setLoadingCollection] = useState(false);

  // --- STATE FOR INTERACTIVE DECK SIMULATOR ---
  const [simulatedHand, setSimulatedHand] = useState<{ uniqId: string; cardId: string; meta?: PokemonCard }[]>([]);
  const [simulatedDeck, setSimulatedDeck] = useState<{ uniqId: string; cardId: string; meta?: PokemonCard }[]>([]);
  const [simSize, setSimSize] = useState<number>(5);
  const [mulliganCount, setMulliganCount] = useState<number>(0);
  const [simHistory, setSimHistory] = useState<string[]>([]);

  // Board positions
  const [activePokemon, setActivePokemon] = useState<{ uniqId: string; cardId: string; meta?: PokemonCard; energiesAttached: number } | null>(null);
  const [benchPokemons, setBenchPokemons] = useState<{ uniqId: string; cardId: string; meta?: PokemonCard; energiesAttached: number }[]>([]);
  const [discardPile, setDiscardPile] = useState<{ uniqId: string; cardId: string; meta?: PokemonCard }[]>([]);

  const [chartType, setChartType] = useState<'category' | 'types' | 'both'>('both');
  const [handSize, setHandSize] = useState<number>(5); // 5 is Pocket starter size, 7 standard
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Helper to shuffle any array (Fisher-Yates)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  };

  // Helper to initialize the simulator
  const handleStartSimulation = (initialHandSize: number = simSize) => {
    // Build a flat deck list representing all quantities
    const flatDeck: { uniqId: string; cardId: string; meta?: PokemonCard }[] = [];
    let counter = 0;
    deckCards.forEach((dc) => {
      const meta = cardMetadata[dc.cardId];
      for (let i = 0; i < dc.quantity; i++) {
        flatDeck.push({
          uniqId: `${dc.cardId}-${counter++}`,
          cardId: dc.cardId,
          meta,
        });
      }
    });

    if (flatDeck.length === 0) return;

    // Reset board
    setActivePokemon(null);
    setBenchPokemons([]);
    setDiscardPile([]);

    // Shuffle
    const shuffled = shuffleArray(flatDeck);

    // Draw initial hand
    const initialHand = shuffled.slice(0, initialHandSize);
    const remainingDeck = shuffled.slice(initialHandSize);

    // Validate basic Pokemon presence for Mulligan
    let hasBasic = false;
    initialHand.forEach((item) => {
      if (item.meta && (item.meta.category || '').toLowerCase().includes('pok')) {
        const nameLower = (item.meta.name || '').toLowerCase();
        const descLower = (item.meta.description || '').toLowerCase();
        const isStage2 = descLower.includes('fase 2') || descLower.includes('stage 2') || nameLower.includes('charizard') || nameLower.includes('blastoise') || nameLower.includes('venusaur') || nameLower.includes('dragonite') || nameLower.includes('gengar');
        const isStage1 = !isStage2 && (descLower.includes('fase 1') || descLower.includes('stage 1') || nameLower.includes('ivysaur') || nameLower.includes('charmeleon') || nameLower.includes('wartortle') || nameLower.includes('haunter'));
        const isBasic = !isStage1 && !isStage2;
        if (isBasic) hasBasic = true;
      }
    });

    setSimulatedHand(initialHand);
    setSimulatedDeck(remainingDeck);
    if (!hasBasic) {
      setMulliganCount((prev) => prev + 1);
      setSimHistory((prev) => [`Mão Inicial sem Pokémons Básicos (Mulligan #${mulliganCount + 1})`, ...prev]);
    } else {
      setSimHistory((prev) => [`Mão Inicial desenhada com sucesso! (Possui Básico)`, ...prev]);
    }
  };

  const handleDrawCard = () => {
    if (simulatedDeck.length === 0) return;
    const nextCard = simulatedDeck[0];
    setSimulatedHand((prev) => [...prev, nextCard]);
    setSimulatedDeck((prev) => prev.slice(1));
    setSimHistory((prev) => [`Comprou: ${nextCard.meta?.name || 'Carta Desconhecida'}`, ...prev]);
  };

  const handleResetSimulation = () => {
    setSimulatedHand([]);
    setSimulatedDeck([]);
    setMulliganCount(0);
    setSimHistory([]);
    setActivePokemon(null);
    setBenchPokemons([]);
    setDiscardPile([]);
  };

  // --- PLAYTEST BOARD ACTIONS ---
  const handleSetAsActive = (card: { uniqId: string; cardId: string; meta?: PokemonCard }) => {
    if (activePokemon) {
      setSimHistory((prev) => [`Aviso: Slot Ativo já está ocupado por ${activePokemon.meta?.name}! Recue ou descarte-o primeiro.`, ...prev]);
      return;
    }
    setActivePokemon({ ...card, energiesAttached: 0 });
    setSimulatedHand((prev) => prev.filter((c) => c.uniqId !== card.uniqId));
    setSimHistory((prev) => [`Promoveu ${card.meta?.name || 'Desconhecido'} a Pokémon Ativo`, ...prev]);
  };

  const handlePutOnBench = (card: { uniqId: string; cardId: string; meta?: PokemonCard }) => {
    const maxBench = simSize === 5 ? 3 : 5;
    if (benchPokemons.length >= maxBench) {
      setSimHistory((prev) => [`Aviso: Banco cheio! Limite de ${maxBench} Pokémons.`, ...prev]);
      return;
    }
    setBenchPokemons((prev) => [...prev, { ...card, energiesAttached: 0 }]);
    setSimulatedHand((prev) => prev.filter((c) => c.uniqId !== card.uniqId));
    setSimHistory((prev) => [`Colocou ${card.meta?.name || 'Desconhecido'} no Banco de Reservas`, ...prev]);
  };

  const handleDiscardFromHand = (card: { uniqId: string; cardId: string; meta?: PokemonCard }) => {
    setDiscardPile((prev) => [...prev, card]);
    setSimulatedHand((prev) => prev.filter((c) => c.uniqId !== card.uniqId));
    setSimHistory((prev) => [`Descartou da mão: ${card.meta?.name || 'Carta'}`, ...prev]);
  };

  const handleAttachEnergyFromHand = (energyUniqId: string, targetType: 'active' | 'bench', benchIndex?: number) => {
    const energyCard = simulatedHand.find((c) => c.uniqId === energyUniqId);
    if (!energyCard) return;

    if (targetType === 'active') {
      if (!activePokemon) {
        setSimHistory((prev) => [`Aviso: Não há Pokémon Ativo para anexar energia!`, ...prev]);
        return;
      }
      setActivePokemon((prev) => prev ? { ...prev, energiesAttached: prev.energiesAttached + 1 } : null);
      setSimulatedHand((prev) => prev.filter((c) => c.uniqId !== energyUniqId));
      setSimHistory((prev) => [`Anexou ${energyCard.meta?.name || 'Energia'} a ${activePokemon.meta?.name} (Ativo)`, ...prev]);
    } else if (targetType === 'bench' && typeof benchIndex === 'number') {
      const targetBench = benchPokemons[benchIndex];
      if (!targetBench) return;
      setBenchPokemons((prev) => prev.map((item, idx) => idx === benchIndex ? { ...item, energiesAttached: item.energiesAttached + 1 } : item));
      setSimulatedHand((prev) => prev.filter((c) => c.uniqId !== energyUniqId));
      setSimHistory((prev) => [`Anexou ${energyCard.meta?.name || 'Energia'} a ${targetBench.meta?.name} (Banco Slot #${benchIndex + 1})`, ...prev]);
    }
  };

  const handleVirtualEnergy = (targetType: 'active' | 'bench', amount: number, benchIndex?: number) => {
    if (targetType === 'active') {
      if (!activePokemon) return;
      setActivePokemon((prev) => prev ? { ...prev, energiesAttached: Math.max(0, prev.energiesAttached + amount) } : null);
      setSimHistory((prev) => [`Modificou Energia do Ativo (${amount > 0 ? '+' : ''}${amount}): Total ${Math.max(0, (activePokemon.energiesAttached || 0) + amount)}`, ...prev]);
    } else if (targetType === 'bench' && typeof benchIndex === 'number') {
      const targetBench = benchPokemons[benchIndex];
      if (!targetBench) return;
      setBenchPokemons((prev) => prev.map((item, idx) => idx === benchIndex ? { ...item, energiesAttached: Math.max(0, item.energiesAttached + amount) } : item));
      setSimHistory((prev) => [`Modificou Energia do Banco Slot #${benchIndex + 1} (${amount > 0 ? '+' : ''}${amount})`, ...prev]);
    }
  };

  const handleRetreatActive = (benchIndex: number) => {
    if (!activePokemon) return;
    const targetBench = benchPokemons[benchIndex];
    if (!targetBench) return;

    const oldActive = { ...activePokemon };
    setActivePokemon({
      uniqId: targetBench.uniqId,
      cardId: targetBench.cardId,
      meta: targetBench.meta,
      energiesAttached: targetBench.energiesAttached,
    });
    setBenchPokemons((prev) => prev.map((item, idx) => idx === benchIndex ? {
      uniqId: oldActive.uniqId,
      cardId: oldActive.cardId,
      meta: oldActive.meta,
      energiesAttached: oldActive.energiesAttached,
    } : item));
    setSimHistory((prev) => [`Recuou ${oldActive.meta?.name} e promoveu ${targetBench.meta?.name} como Ativo`, ...prev]);
  };

  const handleNofifyNocauteActive = () => {
    if (!activePokemon) return;
    setDiscardPile((prev) => [...prev, { uniqId: activePokemon.uniqId, cardId: activePokemon.cardId, meta: activePokemon.meta }]);
    setSimHistory((prev) => [`Pokémon Ativo ${activePokemon.meta?.name} foi Nocauteado / Enviado ao descarte`, ...prev]);
    setActivePokemon(null);
  };

  const handlePromoteBenchToActive = (benchIndex: number) => {
    const targetBench = benchPokemons[benchIndex];
    if (!targetBench) return;
    if (activePokemon) {
      setSimHistory((prev) => [`Aviso: Slot Ativo já está ocupado por ${activePokemon.meta?.name}!`, ...prev]);
      return;
    }
    setActivePokemon({
      uniqId: targetBench.uniqId,
      cardId: targetBench.cardId,
      meta: targetBench.meta,
      energiesAttached: targetBench.energiesAttached,
    });
    setBenchPokemons((prev) => prev.filter((_, idx) => idx !== benchIndex));
    setSimHistory((prev) => [`Promoveu ${targetBench.meta?.name} do Banco para o Slot Ativo`, ...prev]);
  };

  const handleDiscardBench = (benchIndex: number) => {
    const targetBench = benchPokemons[benchIndex];
    if (!targetBench) return;
    setDiscardPile((prev) => [...prev, { uniqId: targetBench.uniqId, cardId: targetBench.cardId, meta: targetBench.meta }]);
    setBenchPokemons((prev) => prev.filter((_, idx) => idx !== benchIndex));
    setSimHistory((prev) => [`Descartou do banco: ${targetBench.meta?.name}`, ...prev]);
  };

  // Sync collection card metadata to offer recommendations
  useEffect(() => {
    async function loadCollectionMeta() {
      setLoadingCollection(true);
      try {
        const col = StorageService.getCollection();
        const ids = col.map((item) => item.cardId);
        if (ids.length > 0) {
          const meta = await CardProvider.getCardsByIds(ids, preferredLanguage as CardLanguage);
          setCollectionMetadata(meta);
        }
      } catch (err) {
        console.error("Error loading collection metadata in deck visualizer", err);
      } finally {
        setLoadingCollection(false);
      }
    }
    loadCollectionMeta();
  }, [deckCards, preferredLanguage]);

  const renderActiveShape = (props: any) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
    } = props;

    return (
      <g>
        <text x={cx} y={cy} dy={4} textAnchor="middle" fill="#FFFFFF" className="text-[11px] font-black tracking-wider">
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 11}
          fill={fill}
        />
      </g>
    );
  };

  // Calculate Category Data
  const categoryCount: Record<string, number> = {
    Pokemon: 0,
    Trainer: 0,
    Energy: 0,
  };

  // Calculate Elemental Type Data
  const typeCount: Record<string, number> = {};
  const pokemonTypesInDeck: Set<string> = new Set();
  const energyTypesInDeck: Set<string> = new Set();

  deckCards.forEach((dc) => {
    const meta = cardMetadata[dc.cardId];
    if (!meta) return;
    const qty = dc.quantity;

    // 1. Category Breakdown
    let cat = meta.category || 'Pokemon';
    if (cat.toLowerCase().includes('pok')) cat = 'Pokemon';
    else if (cat.toLowerCase().includes('train') || cat.toLowerCase().includes('treina')) cat = 'Trainer';
    else if (cat.toLowerCase().includes('energ')) cat = 'Energy';
    else cat = 'Pokemon';

    categoryCount[cat] = (categoryCount[cat] || 0) + qty;

    // 2. Elemental Types Breakdown
    if (meta.types && meta.types.length > 0) {
      meta.types.forEach((t) => {
        typeCount[t] = (typeCount[t] || 0) + qty;
        if (cat === 'Pokemon') {
          pokemonTypesInDeck.add(t);
        }
      });
    } else if (cat === 'Energy') {
      // Try inferring type from Energy card name if not present in types array
      const nameLower = (meta.name || '').toLowerCase();
      let inferred = false;

      for (const [key, val] of Object.entries(TYPE_COLORS)) {
        if (nameLower.includes(val.ptName.toLowerCase()) || nameLower.includes(key.toLowerCase())) {
          typeCount[key] = (typeCount[key] || 0) + qty;
          energyTypesInDeck.add(key);
          inferred = true;
          break;
        }
      }

      if (!inferred) {
        typeCount['Colorless'] = (typeCount['Colorless'] || 0) + qty;
        energyTypesInDeck.add('Colorless');
      }
    }
  });

  // Prepare Category Chart Data
  const categoryData = Object.entries(categoryCount)
    .filter(([, count]) => count > 0)
    .map(([catKey, count]) => ({
      name: CATEGORY_COLORS[catKey]?.ptName || catKey,
      rawKey: catKey,
      value: count,
      fill: CATEGORY_COLORS[catKey]?.fill || '#6B7280',
    }));

  // Prepare Type Chart Data
  const typeData = Object.entries(typeCount)
    .filter(([, count]) => count > 0)
    .map(([tKey, count]) => {
      const typeInfo = TYPE_COLORS[tKey] || { fill: '#6B7280', ptName: tKey, symbol: '✨' };
      return {
        name: `${typeInfo.symbol} ${typeInfo.ptName}`,
        typeKey: tKey,
        quantidade: count,
        fill: typeInfo.fill || '#6B7280',
        symbol: typeInfo.symbol,
        rawName: typeInfo.ptName,
      };
    })
    .sort((a, b) => b.quantidade - a.quantidade);

  const totalCards = deckCards.reduce((acc, c) => acc + c.quantity, 0);

  if (deckCards.length === 0) {
    return null;
  }

  // ----------------------------------------------------
  // SYNERGY & DIAGNOSTICS CALCULATIONS
  // ----------------------------------------------------
  const diagnostics: { type: 'success' | 'warning' | 'info'; title: string; desc: string }[] = [];

  // Check Deck Size (Pocket TCG is 20, Standard is 60)
  if (totalCards === 20) {
    diagnostics.push({
      type: 'success',
      title: 'Formato Pokémon Pocket Ativo',
      desc: 'Seu deck contém exatamente 20 cartas, o tamanho oficial para o formato mobile Pocket.',
    });
  } else if (totalCards === 60) {
    diagnostics.push({
      type: 'success',
      title: 'Formato Standard TCG Ativo',
      desc: 'Seu deck contém exatamente 60 cartas, o tamanho padrão para torneios tradicionais de mesa.',
    });
  } else {
    diagnostics.push({
      type: 'info',
      title: `Deck em Construção (${totalCards} cartas)`,
      desc: 'Os formatos oficiais aceitam decks de exatamente 20 cartas (Pocket) ou 60 cartas (Tradicional).',
    });
  }

  // Energy & Pokémon Matches Check
  const unmatchedPokemonTypes = Array.from(pokemonTypesInDeck).filter(
    (t) => t !== 'Colorless' && !energyTypesInDeck.has(t)
  );

  if (unmatchedPokemonTypes.length > 0 && categoryCount['Energy'] > 0) {
    const typeNames = unmatchedPokemonTypes.map((t) => TYPE_COLORS[t]?.ptName || t).join(', ');
    diagnostics.push({
      type: 'warning',
      title: 'Energias Faltando',
      desc: `Você tem Pokémons do tipo [${typeNames}] mas não possui cartas de Energia correspondentes no deck.`,
    });
  } else if (categoryCount['Pokemon'] > 0 && categoryCount['Energy'] === 0) {
    diagnostics.push({
      type: 'warning',
      title: 'Sem Cartas de Energia',
      desc: 'Seu deck possui Pokémons mas nenhuma energia anexada para atacar.',
    });
  } else if (categoryCount['Pokemon'] > 0 && categoryCount['Energy'] > 0) {
    diagnostics.push({
      type: 'success',
      title: 'Energias Alinhadas',
      desc: 'Todos os tipos de Pokémons ativos possuem energias compatíveis correspondentes no deck.',
    });
  }

  // Trainer density check
  const trainerRatio = totalCards > 0 ? categoryCount['Trainer'] / totalCards : 0;
  if (totalCards >= 20) {
    if (trainerRatio < 0.15) {
      diagnostics.push({
        type: 'warning',
        title: 'Baixa Densidade de Treinadores',
        desc: 'Cartas de Apoiadores e Itens dão consistência ao deck. Considere adicionar mais Treinadores.',
      });
    } else if (trainerRatio > 0.5) {
      diagnostics.push({
        type: 'info',
        title: 'Foco Extremo em Consistência',
        desc: 'Mais de 50% do seu deck é composto por Treinadores. Isso garante excelente fluxo de compra de cartas.',
      });
    } else {
      diagnostics.push({
        type: 'success',
        title: 'Proporção de Suportes Ideal',
        desc: 'Ótimo equilíbrio entre Pokémons de ataque e cartas de suporte/treinadores.',
      });
    }
  }

  // ----------------------------------------------------
  // PROBABILITY CALCULATIONS FOR DECK ITEMS
  // ----------------------------------------------------
  const cardsWithProbability = deckCards
    .map((dc) => {
      const meta = cardMetadata[dc.cardId];
      const name = meta?.name || 'Desconhecida';
      const rarity = meta?.rarity || 'Comum';
      const type = meta?.types?.[0] || 'Colorless';
      const prob = getDrawingProbability(totalCards, dc.quantity, handSize);

      return {
        cardId: dc.cardId,
        name,
        rarity,
        type,
        quantity: dc.quantity,
        probability: prob,
      };
    })
    .sort((a, b) => b.probability - a.probability);

  // ----------------------------------------------------
  // DECK BATTLE STATS & PLAYSTYLE ARCHETYPE CALCULATIONS
  // ----------------------------------------------------
  const pokemonTypes = Array.from(pokemonTypesInDeck);

  // Compute dominant type
  let dominantType = 'Colorless';
  let maxTypeCount = 0;
  const typeCounts: Record<string, number> = {};
  
  deckCards.forEach((dc) => {
    const meta = cardMetadata[dc.cardId];
    if (meta && meta.category === 'Pokemon' && meta.types) {
      meta.types.forEach(t => {
        typeCounts[t] = (typeCounts[t] || 0) + dc.quantity;
      });
    }
  });

  Object.entries(typeCounts).forEach(([type, count]) => {
    if (type !== 'Colorless' && count > maxTypeCount) {
      maxTypeCount = count;
      dominantType = type;
    }
  });

  // Calculate playstyle factors
  let pokemonTotal = 0;
  let basicCount = 0;
  let stage1Count = 0;
  let stage2Count = 0;
  let totalHp = 0;
  let avgAttackCost = 0;
  let attackCount = 0;

  deckCards.forEach((dc) => {
    const meta = cardMetadata[dc.cardId];
    if (!meta || meta.category !== 'Pokemon') return;
    pokemonTotal += dc.quantity;
    totalHp += (meta.hp || 0) * dc.quantity;

    const nameLower = (meta.name || '').toLowerCase();
    const descLower = (meta.description || '').toLowerCase();
    
    // Simple heuristics to identify stages
    const isStage2 = descLower.includes('fase 2') || descLower.includes('stage 2') || nameLower.includes('charizard') || nameLower.includes('blastoise') || nameLower.includes('venusaur') || nameLower.includes('dragonite') || nameLower.includes('gengar');
    const isStage1 = !isStage2 && (descLower.includes('fase 1') || descLower.includes('stage 1') || nameLower.includes('ivysaur') || nameLower.includes('charmeleon') || nameLower.includes('wartortle') || nameLower.includes('haunter'));
    const isBasic = !isStage1 && !isStage2;

    if (isBasic) basicCount += dc.quantity;
    else if (isStage1) stage1Count += dc.quantity;
    else if (isStage2) stage2Count += dc.quantity;

    if (meta.attacks) {
      meta.attacks.forEach((atk) => {
        if (atk.cost) {
          avgAttackCost += atk.cost.length * dc.quantity;
          attackCount += dc.quantity;
        }
      });
    }
  });

  const avgHp = pokemonTotal > 0 ? totalHp / pokemonTotal : 0;
  const avgCost = attackCount > 0 ? avgAttackCost / attackCount : 2;

  const basicRatio = pokemonTotal > 0 ? basicCount / pokemonTotal : 0.8;

  // SPEED score:
  // Higher speed if: high proportion of basic Pokémons, lower energy costs, plenty of trainer cards
  let speedScore = Math.round(
    (basicRatio * 55) + 
    (Math.max(0, 4 - avgCost) * 12) + 
    (trainerRatio * 25)
  );
  speedScore = Math.min(100, Math.max(15, speedScore));

  // POWER (Dano Brutal) score:
  // Higher power if Stage 1/2 presence, high HP, and heavy attacks
  let powerScore = Math.round(
    ((stage1Count * 2 + stage2Count * 3.5) / (pokemonTotal || 1) * 45) + 
    (Math.min(180, Math.max(50, avgHp)) - 50) / 1.2 + 
    (avgCost * 8)
  );
  powerScore = Math.min(100, Math.max(10, powerScore));

  // CONSISTENCY (Consistência) score:
  // Trainer density and balanced energy-to-pokemon setup
  const energyCount = categoryCount['Energy'] || 0;
  const energyRatio = totalCards > 0 ? energyCount / totalCards : 0.3;
  const idealEnergyPenalty = Math.abs(energyRatio - 0.35) * 80;
  const idealTrainerBonus = Math.min(45, trainerRatio * 90);

  let consistencyScore = Math.round(
    (100 - idealEnergyPenalty) * 0.45 + 
    idealTrainerBonus + 
    (totalCards >= 20 ? 15 : 0)
  );
  consistencyScore = Math.min(100, Math.max(20, consistencyScore));

  // DEFENSE & SUPPORT score:
  // Higher if we have defensive types or many trainer resources
  const defenseTypes = ['Grass', 'Metal', 'Psychic', 'Fighting'];
  const defenseTypeBonus = pokemonTypes.some(t => defenseTypes.includes(t)) ? 15 : 0;
  let defenseScore = Math.round(
    (Math.min(180, Math.max(50, avgHp)) - 50) * 0.35 + 
    (trainerRatio * 35) + 
    defenseTypeBonus
  );
  defenseScore = Math.min(100, Math.max(15, defenseScore));

  // Archetype determination
  let archetypeTitle = '';
  let archetypeDesc = '';
  let archetypeTag = '';
  let archetypeColor = '';

  if (speedScore > 62 && powerScore < 55) {
    archetypeTitle = 'Ataque Rápido (Aggro Speed)';
    archetypeTag = 'Ataque Rápido';
    archetypeColor = 'from-amber-500 to-red-500 border-red-500/30';
    archetypeDesc = 'Focado em descer Pokémons Básicos rapidamente e aplicar pressão com ataques de custo baixo de energia antes que o oponente consiga evoluir ou preparar o tabuleiro.';
  } else if (powerScore > 62 && speedScore < 55) {
    archetypeTitle = 'Setup de Alto Dano (Late Game Heavy / Control)';
    archetypeTag = 'Setup de Alto Dano';
    archetypeColor = 'from-red-500 to-purple-600 border-purple-500/30';
    archetypeDesc = 'Focado em suportar a pressão inicial para evoluir seus Pokémons principais até o estágio final (Fase 1/2 ou EX). Uma vez preparado, possui poder de fogo devastador capaz de nocautear oponentes com um único ataque.';
  } else if (consistencyScore > 68 && speedScore < 58 && powerScore < 58) {
    archetypeTitle = 'Controle & Consistência (Tempo Control)';
    archetypeTag = 'Controle e Recuo';
    archetypeColor = 'from-blue-500 to-indigo-600 border-indigo-500/30';
    archetypeDesc = 'Focado em ditar o ritmo da partida através de cartas de Treinadores de efeito de status e controle de energia. Ganha vantagem acumulando recursos e quebrando a sinergia inimiga.';
  } else {
    archetypeTitle = 'Equilibrado (Midrange Versátil)';
    archetypeTag = 'Equilibrado';
    archetypeColor = 'from-emerald-500 to-teal-600 border-teal-500/30';
    archetypeDesc = 'Equilibra perfeitamente a agilidade dos Pokémons básicos com a solidez e força ofensiva das evoluções secundárias. Adapta-se bem a qualquer momento da partida e responde de forma flexível tanto a estratégias defensivas quanto agressivas.';
  }

  // Owned cards suggestions (from collection)
  const ownedCollection = StorageService.getCollection();
  const deckQtyMap: Record<string, number> = {};
  deckCards.forEach((dc) => {
    deckQtyMap[dc.cardId] = dc.quantity;
  });

  const collectibleSuggestions = ownedCollection
    .map((ci) => {
      const deckQty = deckQtyMap[ci.cardId] || 0;
      const availableToAdd = ci.quantity - deckQty;
      return {
        cardId: ci.cardId,
        availableToAdd,
      };
    })
    .filter((item) => item.availableToAdd > 0);

  const ownedSuggestions = collectibleSuggestions
    .map((s) => {
      const meta = collectionMetadata[s.cardId];
      return {
        ...s,
        meta,
      };
    })
    .filter((s): s is typeof s & { meta: PokemonCard } => {
      if (!s.meta) return false;
      const isTrainer = s.meta.category?.toLowerCase().includes('train') || s.meta.category?.toLowerCase().includes('treina');
      const isEnergy = s.meta.category?.toLowerCase().includes('energ');
      const hasMatchingType = s.meta.types?.some((t) => pokemonTypesInDeck.has(t));
      return isTrainer || isEnergy || hasMatchingType;
    })
    .slice(0, 6); // Limit to top 6 suggestions to keep UI clean and fast

  // Buy/Acquisition tips
  const BUY_RECOMMENDATIONS_BY_TYPE: Record<string, { name: string; type: string; desc: string; rarity: string }[]> = {
    Grass: [
      { name: 'Venusaur ex', type: 'Planta', desc: 'HP colossal de 190 com cura ativa. Perfeito para tanquear e desgastar o oponente.', rarity: 'Rara EX' },
      { name: 'Erika', type: 'Treinador', desc: 'Apoiador essencial que cura 50 pontos de dano de seus Pokémons de Planta.', rarity: 'Incomum' },
      { name: 'Pinsir', type: 'Planta', desc: 'Atacante básico forte que pune recuos rápidos com dano contundente.', rarity: 'Rara' },
    ],
    Water: [
      { name: 'Articuno ex', type: 'Água', desc: 'Inundação de dano rápido por apenas 2 energias. Excelente mobilidade.', rarity: 'Rara EX' },
      { name: 'Misty', type: 'Treinador', desc: 'Permite jogar moedas para acelerar múltiplas energias de Água de uma vez.', rarity: 'Incomum' },
      { name: 'Blastoise ex', type: 'Água', desc: 'Seu ataque canhão causa 160 de dano devastador a qualquer ameaça.', rarity: 'Rara EX' },
    ],
    Fire: [
      { name: 'Charizard ex', type: 'Fogo', desc: 'Dano supremo de 200+. Finaliza qualquer Pokémon do formato instantaneamente.', rarity: 'Rara EX' },
      { name: 'Moltres ex', type: 'Fogo', desc: 'Acelerador de energia lendário. Carrega seus atacantes no banco com facilidade.', rarity: 'Rara EX' },
      { name: 'Blaine', type: 'Treinador', desc: 'Aumenta em +30 de dano os ataques de fogo de Pokémons específicos neste turno.', rarity: 'Incomum' },
    ],
    Lightning: [
      { name: 'Pikachu ex', type: 'Elétrico', desc: 'Ataque ultra rápido de 90 de dano por apenas 2 energias. O rei do meta veloz.', rarity: 'Rara EX' },
      { name: 'Zapdos ex', type: 'Elétrico', desc: 'Sem custo de recuo e ataque aleatório potente. Pressão total no turno 1.', rarity: 'Rara EX' },
      { name: 'Eletricista', type: 'Treinador', desc: 'Busca energias elétricas diretamente do deck para manter a velocidade.', rarity: 'Incomum' },
    ],
    Psychic: [
      { name: 'Mewtwo ex', type: 'Psíquico', desc: 'Atacante imbatível de 150 de dano. Sinergiza perfeitamente com aceleração.', rarity: 'Rara EX' },
      { name: 'Gardevoir ex', type: 'Psíquico', desc: 'Habilidade Psicosmose acelera energias da pilha de descarte para seus atacantes.', rarity: 'Rara EX' },
      { name: 'Sabrina', type: 'Treinador', desc: 'Força o oponente a trocar o Pokémon ativo. Essencial para controle de mesa.', rarity: 'Incomum' },
    ],
    Darkness: [
      { name: 'Arbok ex', type: 'Sombrio', desc: 'Prende o Pokémon ativo do oponente e descarta recursos da mão dele.', rarity: 'Rara EX' },
      { name: 'Nidoqueen', type: 'Sombrio', desc: 'Aumenta o dano baseado no número de Pokémons no seu banco.', rarity: 'Rara' },
      { name: 'Koga', type: 'Treinador', desc: 'Apoiador de veneno que sabota a durabilidade dos atacantes inimigos.', rarity: 'Incomum' },
    ],
    Fighting: [
      { name: 'Machamp ex', type: 'Luta', desc: 'HP massivo e ataques que causam mais dano se ele tiver contadores de dano.', rarity: 'Rara EX' },
      { name: 'Marowak ex', type: 'Luta', desc: 'Ataque de baixo custo de energia com potencial de dano explosivo em moedas.', rarity: 'Rara EX' },
      { name: 'Giovanni', type: 'Treinador', desc: 'Apoiador universal que adiciona +10 de dano a qualquer ataque neste turno.', rarity: 'Incomum' },
    ],
    Metal: [
      { name: 'Melmetal', type: 'Metal', desc: 'Defesa blindada que reduz o dano recebido. Excelente âncora de fim de jogo.', rarity: 'Rara' },
      { name: 'Açoite de Metal', type: 'Treinador', desc: 'Aumenta o dano de Pokémons de metal ativos para romper defesas.', rarity: 'Incomum' },
    ],
    Dragon: [
      { name: 'Dragonite', type: 'Dragão', desc: 'Ataque meteórico de 130 de dano que limpa a mesa do oponente.', rarity: 'Rara' },
    ]
  };

  const DEFAULT_BUY_RECOMMENDATIONS = [
    { name: 'Poké Bola', type: 'Treinador', desc: 'Item indispensável para qualquer deck. Busca Pokémons básicos essenciais de graça.', rarity: 'Comum' },
    { name: 'Pesquisa de Professor', type: 'Treinador', desc: 'Apoiador mais forte do formato. Compra 3 cartas novas para renovar sua mão.', rarity: 'Comum' },
    { name: 'Sabrina', type: 'Treinador', desc: 'Permite recuar estrategicamente o Pokémon inimigo. Define vitórias e nocautes.', rarity: 'Incomum' },
  ];

  const typeBuyRecommendations = BUY_RECOMMENDATIONS_BY_TYPE[dominantType] || [];
  const buyRecommendations = [...typeBuyRecommendations, ...DEFAULT_BUY_RECOMMENDATIONS].slice(0, 4);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Análise & Assistente de Batalha</h3>
            <p className="text-xs text-slate-400">
              Estatísticas gráficas, probabilidade de abertura e dicas de melhoria do deck
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold overflow-x-auto max-w-full scrollbar-none gap-1">
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-3.5 py-2 rounded-lg transition-all flex-shrink-0 flex items-center gap-1.5 ${
              activeTab === 'charts' ? 'bg-purple-600 text-white shadow font-extrabold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Estatísticas Gráficas
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3.5 py-2 rounded-lg transition-all flex-shrink-0 flex items-center gap-1.5 ${
              activeTab === 'assistant' ? 'bg-purple-600 text-white shadow font-extrabold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Assistente de Batalha
          </button>
          <button
            onClick={() => {
              setActiveTab('simulator');
              // Initialize simulator with current settings
              handleStartSimulation(simSize);
            }}
            className={`px-3.5 py-2 rounded-lg transition-all flex-shrink-0 flex items-center gap-1.5 ${
              activeTab === 'simulator' ? 'bg-purple-600 text-white shadow font-extrabold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-purple-400" />
            Simulador de Deck
          </button>
        </div>
      </div>

      {activeTab === 'charts' ? (
        <>
          {/* View mode buttons */}
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-2xl border border-slate-800/80 text-xs">
            <span className="text-slate-400 font-bold font-mono text-[11px]">Visualizar Distribuição:</span>
            <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
              <button
                onClick={() => setChartType('both')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] ${
                  chartType === 'both' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Gráficos Gerais
              </button>
              <button
                onClick={() => setChartType('category')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] ${
                  chartType === 'category' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Categorias
              </button>
              <button
                onClick={() => setChartType('types')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold text-[10px] ${
                  chartType === 'types' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tipos Elementares
              </button>
            </div>
          </div>

      <div className={`grid gap-6 ${chartType === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* CATEGORY PIE CHART */}
        {(chartType === 'both' || chartType === 'category') && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Categorias de Cartas</span>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              {categoryData.length === 0 ? (
                <div className="text-xs text-slate-500">Sem dados de categorias</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      {...({
                        data: categoryData,
                        cx: "50%",
                        cy: "50%",
                        innerRadius: 50,
                        outerRadius: 80,
                        paddingAngle: 4,
                        dataKey: "value",
                        activeIndex: activeIndex,
                        activeShape: renderActiveShape,
                        onMouseEnter: (_, index: number) => setActiveIndex(index),
                        onMouseLeave: () => setActiveIndex(undefined),
                        label: ({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`,
                        labelLine: false,
                        isAnimationActive: true,
                        animationBegin: 0,
                        animationDuration: 800
                      } as any)}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="#0f172a" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                      formatter={(val: number) => [`${val} cartas`, 'Quantidade']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Legend badges */}
            <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-slate-800/50">
              {categoryData.map((cat) => {
                const categorySymbols: Record<string, string> = {
                  Pokemon: '🐹',
                  Trainer: '🎒',
                  Energy: '🔋',
                };
                const sym = categorySymbols[cat.rawKey] || '✨';
                return (
                  <div
                    key={cat.rawKey}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium transition-all hover:scale-105"
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm select-none" style={{ backgroundColor: cat.fill }}>
                      {sym}
                    </span>
                    <span className="text-slate-300 font-bold">{cat.name}</span>
                    <span className="text-white font-black bg-slate-950 px-1.5 py-0.5 rounded-full text-[10px] border border-slate-800">{cat.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ELEMENTAL TYPE BAR CHART */}
        {(chartType === 'both' || chartType === 'types') && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>Tipos Elementares (Pokémon/Energias)</span>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              {typeData.length === 0 ? (
                <div className="text-xs text-slate-500">Nenhum tipo elementar identificado no deck</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                      }}
                      formatter={(val: number) => [`${val} cartas`, 'Quantidade']}
                    />
                    <Bar
                      dataKey="quantidade"
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Legend badges */}
            <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-slate-800/50">
              {typeData.map((t) => (
                <div
                  key={t.typeKey}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium transition-all hover:scale-105"
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm select-none" style={{ backgroundColor: t.fill }}>
                    {t.symbol}
                  </span>
                  <span className="text-slate-300 font-bold">{t.rawName}</span>
                  <span className="text-white font-black bg-slate-950 px-1.5 py-0.5 rounded-full text-[10px] border border-slate-800">{t.quantidade}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🔬 INTERACTIVE PROBABILITY CALCULATOR & DIAGNOSTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-800">
        
        {/* LEFT COLUMN: DIAGNOSTICS & SYNERGIES */}
        <div className="lg:col-span-5 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Sinergias & Diagnósticos</span>
          </div>
          
          <div className="space-y-3">
            {diagnostics.map((diag, index) => (
              <div
                key={index}
                className={`p-3.5 rounded-xl border flex gap-3 transition-all ${
                  diag.type === 'success'
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                    : diag.type === 'warning'
                    ? 'bg-amber-950/20 border-amber-500/20 text-amber-300'
                    : 'bg-blue-950/20 border-blue-500/20 text-blue-300'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {diag.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : diag.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-0.5">{diag.title}</h4>
                  <p className="text-[11px] leading-relaxed text-slate-400">{diag.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: STARTING HAND HYPERGEOMETRIC PROBABILITIES */}
        <div className="lg:col-span-7 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold text-sm text-white">
              <Calculator className="w-4 h-4 text-purple-400" />
              <span>Simulador de Mão Inicial</span>
            </div>

            {/* Hand size picker */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 px-1 font-bold">Mão:</span>
              <button
                onClick={() => setHandSize(5)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  handSize === 5 ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                5 cartas (Pocket)
              </button>
              <button
                onClick={() => setHandSize(7)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                  handSize === 7 ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 cartas (TCG)
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Probabilidade hipergeométrica de obter **pelo menos 1 cópia** da carta na sua mão inicial de abertura de **{handSize} cartas** (considerando deck completo de {totalCards} cartas).
          </p>

          <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {cardsWithProbability.map((cp) => {
              const colorInfo = TYPE_COLORS[cp.type] || TYPE_COLORS['Other'];
              const pct = (cp.probability * 100).toFixed(0);
              const isHigh = cp.probability >= 0.7;
              const isMedium = cp.probability >= 0.4 && cp.probability < 0.7;

              return (
                <div
                  key={cp.cardId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50 hover:bg-slate-900 transition-all gap-3"
                >
                  <div className="flex items-center gap-2 truncate">
                    {/* Tiny type tag or indicator */}
                    <span className={`w-2 h-2 rounded-full shrink-0`} style={{ backgroundColor: colorInfo.fill }} />
                    <span className="text-xs font-bold text-white truncate">{cp.name}</span>
                    <span className="text-[10px] font-bold text-slate-500 font-mono">x{cp.quantity}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Prob Progress Bar */}
                    <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full rounded-full ${
                          isHigh ? 'bg-emerald-500' : isMedium ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {/* Percent Badge */}
                    <span
                      className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-lg border ${
                        isHigh
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isMedium
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  ) : activeTab === 'assistant' ? (
    <div className="space-y-6">
      {/* 1. SEÇÃO DE ARQUÉTIPO E VELOCIDADE */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-950 to-purple-950/30 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
              <Swords className="w-3 h-3" /> Arquétipo de Combate
            </span>
            <h4 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              {archetypeTitle}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              {archetypeDesc}
            </p>
          </div>

          {/* Dominant Type Badge */}
          {dominantType !== 'Colorless' && TYPE_COLORS[dominantType] && (
            <div className={`self-start md:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-extrabold text-xs ${TYPE_COLORS[dominantType].bg} ${TYPE_COLORS[dominantType].text} border-slate-800 shadow-md`}>
              <span>Estilo Principal:</span>
              <span>{TYPE_COLORS[dominantType].symbol} {TYPE_COLORS[dominantType].ptName}</span>
            </div>
          )}
        </div>

        {/* 2. PROGRESS BARS / BATTLE METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Velocidade de Ataque */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Velocidade de Setup (Ataque)
              </span>
              <span className="font-mono text-white text-xs">{speedScore}/100</span>
            </div>
            <div className="bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${speedScore}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              {speedScore > 65 
                ? 'Inicia e ataca muito rápido. Excelente uso de Pokémons Básicos e ataques de baixo custo de energia.' 
                : speedScore > 45 
                ? 'Velocidade equilibrada. Requer alguma preparação média, mas possui ótimo fluxo de início.' 
                : 'Setup lento. Decks com este ritmo precisam de defesas ou treinadores de suporte para sobreviver aos primeiros turnos.'}
            </p>
          </div>

          {/* Poder de Dano Brutal */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-red-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Poder de Impacto (Dano)
              </span>
              <span className="font-mono text-white text-xs">{powerScore}/100</span>
            </div>
            <div className="bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500"
                style={{ width: `${powerScore}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              {powerScore > 65 
                ? 'Poder de fogo devastador. Seus atacantes evoluídos ou EX são letais e possuem alto HP de sobrevivência.' 
                : powerScore > 40 
                ? 'Dano moderado e constante. Consegue nocautear alvos de forma progressiva com boa cadência.' 
                : 'Ataques leves. Focado em consistência de efeitos, status negativos ou desgaste rápido de energia.'}
            </p>
          </div>

          {/* Consistência / Compra de Cartas */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-blue-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" /> Consistência & Fluxo de Mão
              </span>
              <span className="font-mono text-white text-xs">{consistencyScore}/100</span>
            </div>
            <div className="bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${consistencyScore}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              {consistencyScore > 70 
                ? 'Altíssima consistência de compra. Muitos itens e apoiadores que mantêm sua mão cheia de recursos.' 
                : consistencyScore > 45 
                ? 'Fluxo padrão de TCG. Consegue encontrar o que precisa na maioria das rodadas sem travar.' 
                : 'Risco de travamento de mão. Considere adicionar mais cartas de busca (Poké Bola) ou compra (Professor).'}
            </p>
          </div>

          {/* Suporte & Defesa */}
          <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Resistência & Durabilidade
              </span>
              <span className="font-mono text-white text-xs">{defenseScore}/100</span>
            </div>
            <div className="bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${defenseScore}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              {defenseScore > 65 
                ? 'Excelente resiliência geral. Pokémons com HP alto ou cartas de cura ativa e controle de recuo.' 
                : defenseScore > 40 
                ? 'Capacidade defensiva moderada. Depende de trocas de recuo calculadas no banco de reservas.' 
                : 'Deck frágil. Pokémons com HP mais baixo que precisam nocautear o oponente antes de sofrerem revide.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. ASSISTENTE DE MELHORIA: CARTAS QUE POSSUO */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-inner">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Melhorar com Cartas do seu Acervo Físico
            </h4>
            <p className="text-[10px] text-slate-400">
              Adicione cartas compatíveis que você possui na sua coleção para otimizar a sinergia deste deck
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
            {ownedSuggestions.length} disponíveis
          </span>
        </div>

        {loadingCollection ? (
          <div className="text-center py-6 text-xs text-slate-500">Sincronizando acervo de cartas...</div>
        ) : ownedSuggestions.length === 0 ? (
          <div className="bg-slate-900/30 rounded-xl p-5 text-center text-xs text-slate-500 border border-slate-850/60 leading-relaxed">
            Nenhuma sugestão compatível não-utilizada no seu acervo físico no momento. <br />
            <span className="text-[10px] text-slate-600">Adicione mais cartas no binder virtual para receber recomendações personalizadas!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ownedSuggestions.map((item) => {
              const currentInDeck = deckQtyMap[item.cardId] || 0;
              return (
                <div 
                  key={item.cardId} 
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800/60 hover:border-purple-500/30 hover:bg-slate-900/90 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.meta.image && (
                      <div className="w-7 h-10 rounded overflow-hidden shrink-0 border border-slate-800 shadow-sm">
                        <img src={item.meta.image} alt={item.meta.name} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{item.meta.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono truncate">
                        {item.meta.setName} • No Deck: {currentInDeck}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onAddCardToDeck?.(item.cardId, 1)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] shrink-0 transition-all flex items-center gap-1 active:scale-95 shadow"
                  >
                    <Plus className="w-3 h-3" /> Adicionar (+{item.availableToAdd})
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. DICAS DE AQUISIÇÃO / COMPRA */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-inner">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            Sugestões de Cartas para Adquirir / Comprar
          </h4>
          <p className="text-[10px] text-slate-400">
            Cartas essenciais e de alto desempenho competitivo ideais para fortalecer este deck
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {buyRecommendations.map((rec, i) => (
            <div 
              key={i} 
              className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-850 flex flex-col justify-between gap-3 hover:bg-slate-900/80 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-white">{rec.name}</span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-purple-950/50 text-purple-400 border border-purple-900/30">
                    {rec.rarity}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider font-mono">
                  Categoria: {rec.type}
                </span>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {rec.desc}
                </p>
              </div>

              <a 
                href={`https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(rec.name)}`}
                target="_blank" 
                rel="noreferrer"
                className="w-full text-center py-1.5 rounded-lg bg-slate-950 text-slate-300 font-bold hover:text-white text-[10px] border border-slate-850 hover:border-slate-800 hover:bg-slate-950/40 transition-all shadow-sm"
              >
                Buscar Preço na LigaPokémon ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      {/* Interactive Deck Simulator */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/20 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <Calculator className="w-3 h-3" /> Simulador de Campo de Batalha & Mão
            </span>
            <h4 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              Playtest Sandbox Interativo
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Embaralhe seu deck, compre sua mão de abertura e simule turnos reais baixando Pokémons ativos, ocupando o banco de reservas, anexando energias e testando recuos táticos.
            </p>
          </div>

          {/* Format Settings inside the simulator */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start md:self-center">
            <span className="text-[10px] text-slate-400 px-2 font-extrabold">Formato:</span>
            <button
              onClick={() => {
                setSimSize(5);
                handleStartSimulation(5);
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                simSize === 5 ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pocket (5 cartas)
            </button>
            <button
              onClick={() => {
                setSimSize(7);
                handleStartSimulation(7);
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                simSize === 7 ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tradicional (7 cartas)
            </button>
          </div>
        </div>

        {/* CONTROLS AND METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cartas na Mão</span>
            <div className="text-2xl font-black text-white font-mono">{simulatedHand.length}</div>
            <p className="text-[9px] text-slate-500">Disponíveis na sua mão</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deck Restante</span>
            <div className="text-2xl font-black text-indigo-400 font-mono">{simulatedDeck.length}</div>
            <p className="text-[9px] text-slate-500">Próximas cartas do topo</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mulligans Acumulados</span>
            <div className={`text-2xl font-black font-mono ${mulliganCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{mulliganCount}</div>
            <p className="text-[9px] text-slate-500">Sorteios sem Pokémon Básico</p>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-3.5 space-y-1 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status da Simulação</span>
            {simulatedHand.length === 0 && !activePokemon && benchPokemons.length === 0 ? (
              <span className="text-xs font-extrabold text-slate-500">Aguardando Início</span>
            ) : (() => {
              // Check if hand or board contains a basic Pokémon
              let hasBasic = false;
              if (activePokemon) hasBasic = true;
              if (benchPokemons.length > 0) hasBasic = true;
              simulatedHand.forEach((item) => {
                if (item.meta && (item.meta.category || '').toLowerCase().includes('pok')) {
                  const nameLower = (item.meta.name || '').toLowerCase();
                  const descLower = (item.meta.description || '').toLowerCase();
                  const isStage2 = descLower.includes('fase 2') || descLower.includes('stage 2') || nameLower.includes('charizard') || nameLower.includes('blastoise') || nameLower.includes('venusaur') || nameLower.includes('dragonite') || nameLower.includes('gengar');
                  const isStage1 = !isStage2 && (descLower.includes('fase 1') || descLower.includes('stage 1') || nameLower.includes('ivysaur') || nameLower.includes('charmeleon') || nameLower.includes('wartortle') || nameLower.includes('haunter'));
                  const isBasic = !isStage1 && !isStage2;
                  if (isBasic) hasBasic = true;
                }
              });
              return hasBasic ? (
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Campo/Mão OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" /> Sem Básico Ativo/Mão
                </span>
              );
            })()}
            <p className="text-[9px] text-slate-500">Pronto para jogar</p>
          </div>
        </div>

        {/* INTERACTION ACTION PANEL */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-850">
          <button
            onClick={() => handleStartSimulation()}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5 active:scale-95"
          >
            <Shuffle className="w-4 h-4" /> Embaralhar & Comprar Mão Inicial
          </button>

          <button
            onClick={handleDrawCard}
            disabled={simulatedDeck.length === 0}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Comprar Próxima Carta (+1)
          </button>

          <button
            onClick={handleResetSimulation}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 ml-auto border border-slate-700"
          >
            Resetar Tabuleiro
          </button>
        </div>

        {/* THE TACTICAL PLAYTEST BOARD */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
          {/* Decorative playmat lines */}
          <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-slate-850 pb-3 relative z-10">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> Campo de Batalha (Simulador de Mesa)
            </span>
            <span className="text-[10px] text-slate-500 font-bold">Arraste ou use os botões rápidos para simular jogadas</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
            
            {/* ACTIVE POKEMON ZONE (4 Cols) */}
            <div className="lg:col-span-4 bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex flex-col items-center justify-center min-h-[250px] relative">
              <span className="absolute top-3 left-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Pokémon Ativo
              </span>

              {activePokemon ? (
                <div className="w-full max-w-[200px] bg-slate-950 border-2 border-indigo-500/50 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between">
                  {/* Card Image / Header */}
                  {activePokemon.meta?.image ? (
                    <div className="h-28 w-full bg-slate-950 overflow-hidden relative border-b border-slate-850">
                      <img 
                        src={activePokemon.meta.image} 
                        alt={activePokemon.meta.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-1.5 right-1.5">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-950/90 text-white border border-slate-800 shadow">
                          {activePokemon.meta.hp} HP
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 w-full bg-slate-950/80 flex items-center justify-center text-3xl border-b border-slate-850 shrink-0">
                      🦁
                    </div>
                  )}

                  {/* Body Details */}
                  <div className="p-3 space-y-2">
                    <div>
                      <h6 className="text-xs font-black text-white truncate">{activePokemon.meta?.name}</h6>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {activePokemon.energiesAttached} ⚡ Energias
                        </span>
                      </div>
                    </div>

                    {/* Active Controls */}
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-850">
                      <button
                        onClick={() => handleVirtualEnergy('active', 1)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-black rounded transition-all flex items-center justify-center gap-0.5"
                        title="Anexar 1 Energia"
                      >
                        + ⚡
                      </button>
                      <button
                        onClick={() => handleVirtualEnergy('active', -1)}
                        disabled={activePokemon.energiesAttached === 0}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-red-400 text-[10px] font-black rounded transition-all flex items-center justify-center gap-0.5"
                        title="Remover 1 Energia"
                      >
                        - 🚫
                      </button>
                      <button
                        onClick={handleNofifyNocauteActive}
                        className="col-span-2 px-2 py-1 bg-red-950/40 hover:bg-red-900/30 border border-red-500/20 text-red-400 text-[10px] font-bold rounded transition-all flex items-center justify-center gap-1"
                      >
                        <Skull className="w-3 h-3" /> Nocautear/Descartar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-850 hover:border-slate-700 rounded-2xl w-full max-w-[180px] h-48 flex flex-col items-center justify-center p-4 text-center transition-all">
                  <span className="text-3xl mb-2 opacity-30">🛡️</span>
                  <span className="text-[11px] font-black text-slate-500">Slot Ativo Vazio</span>
                  <p className="text-[9px] text-slate-600 mt-1">Escolha um Pokémon básico da sua mão para colocar no combate</p>
                </div>
              )}
            </div>

            {/* BENCH ZONE (8 Cols) */}
            <div className="lg:col-span-8 bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex flex-col justify-between min-h-[250px] relative">
              <span className="absolute top-3 left-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                Banco de Reservas ({benchPokemons.length}/{simSize === 5 ? 3 : 5})
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-6 w-full">
                {Array.from({ length: simSize === 5 ? 3 : 5 }).map((_, idx) => {
                  const bCard = benchPokemons[idx];

                  if (bCard) {
                    return (
                      <div 
                        key={bCard.uniqId}
                        className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col justify-between"
                      >
                        {/* Mini image or icon */}
                        {bCard.meta?.image ? (
                          <div className="h-20 w-full overflow-hidden relative border-b border-slate-850 bg-slate-900">
                            <img 
                              src={bCard.meta.image} 
                              alt={bCard.meta.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-full bg-slate-900 flex items-center justify-center text-xl border-b border-slate-850">
                            🦁
                          </div>
                        )}

                        <div className="p-2 space-y-1.5">
                          <div className="truncate">
                            <span className="text-[10px] font-black text-white">{bCard.meta?.name}</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 block">
                            ⚡ {bCard.energiesAttached} Energias
                          </span>

                          <div className="space-y-1 pt-1 border-t border-slate-850">
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                onClick={() => handleVirtualEnergy('bench', 1, idx)}
                                className="p-0.5 bg-slate-900 hover:bg-slate-850 text-emerald-400 text-[8px] font-black rounded"
                              >
                                +⚡
                              </button>
                              <button
                                onClick={() => handleVirtualEnergy('bench', -1, idx)}
                                disabled={bCard.energiesAttached === 0}
                                className="p-0.5 bg-slate-900 hover:bg-slate-850 disabled:opacity-40 text-red-400 text-[8px] font-black rounded"
                              >
                                -🚫
                              </button>
                            </div>
                            <button
                              onClick={() => handlePromoteBenchToActive(idx)}
                              disabled={!!activePokemon}
                              className="w-full p-1 bg-indigo-950/60 hover:bg-indigo-900/40 border border-indigo-500/20 disabled:opacity-30 disabled:pointer-events-none text-indigo-300 text-[8px] font-black rounded flex items-center justify-center gap-0.5"
                            >
                              <ArrowUpCircle className="w-2.5 h-2.5" /> Ativo
                            </button>
                            
                            {activePokemon && (
                              <button
                                onClick={() => handleRetreatActive(idx)}
                                className="w-full p-1 bg-slate-900 hover:bg-slate-850 text-slate-300 text-[8px] font-black rounded"
                              >
                                Recuar ⇄
                              </button>
                            )}

                            <button
                              onClick={() => handleDiscardBench(idx)}
                              className="w-full p-0.5 text-red-500 hover:bg-red-500/10 text-[8px] font-bold rounded"
                            >
                              Descartar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={idx}
                      className="border border-dashed border-slate-850 rounded-xl h-40 flex flex-col items-center justify-center p-3 text-center bg-slate-950/20"
                    >
                      <span className="text-slate-700 font-mono text-[10px] font-black">Slot {idx + 1}</span>
                      <span className="text-[9px] text-slate-600 mt-1">Livre</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* VISUAL HAND AND HISTORY COLUMN SPREAD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* VISUAL HAND (8 cols) */}
          <div className="lg:col-span-8 bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                <span>Cartas na Mão</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {simulatedHand.length}
                </span>
              </h5>
              <span className="text-[9px] text-slate-500">Selecione uma ação rápida sob a carta</span>
            </div>

            {simulatedHand.length === 0 ? (
              <div className="border border-dashed border-slate-850 rounded-xl p-10 text-center text-slate-500 text-xs space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800">
                  🃏
                </div>
                <div>
                  Sua mão simulada está vazia.<br />
                  <span className="text-[10px] text-slate-600">Clique em "Embaralhar & Comprar Mão Inicial" ou compre novas cartas para expandir.</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {simulatedHand.map((item, index) => {
                  if (!item.meta) return null;
                  
                  // Heuristic to check Pokemon stage
                  const isPokemon = (item.meta.category || '').toLowerCase().includes('pok');
                  const isTrainer = (item.meta.category || '').toLowerCase().includes('train') || (item.meta.category || '').toLowerCase().includes('treina');
                  const isEnergy = (item.meta.category || '').toLowerCase().includes('energ');
                  
                  let stageText = 'Básico';
                  let isBasic = true;
                  if (isPokemon) {
                    const nameLower = (item.meta.name || '').toLowerCase();
                    const descLower = (item.meta.description || '').toLowerCase();
                    const isStage2 = descLower.includes('fase 2') || descLower.includes('stage 2') || nameLower.includes('charizard') || nameLower.includes('blastoise') || nameLower.includes('venusaur') || nameLower.includes('dragonite') || nameLower.includes('gengar');
                    const isStage1 = !isStage2 && (descLower.includes('fase 1') || descLower.includes('stage 1') || nameLower.includes('ivysaur') || nameLower.includes('charmeleon') || nameLower.includes('wartortle') || nameLower.includes('haunter'));
                    isBasic = !isStage1 && !isStage2;
                    stageText = isStage2 ? 'Fase 2' : isStage1 ? 'Fase 1' : 'Básico';
                  }

                  const firstType = item.meta.types?.[0] || 'Colorless';
                  const typeColors = TYPE_COLORS[firstType] || TYPE_COLORS['Other'];

                  return (
                    <div 
                      key={item.uniqId}
                      className="group relative bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-md hover:border-indigo-500/30 transition-all flex flex-col justify-between"
                    >
                      {/* Image header if available */}
                      {item.meta.image ? (
                        <div className="h-28 w-full bg-slate-950 overflow-hidden relative border-b border-slate-850">
                          <img 
                            src={item.meta.image} 
                            alt={item.meta.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-1.5 right-1.5">
                            {isPokemon && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-950/80 text-white border border-slate-800 shadow`}>
                                {item.meta.hp} HP
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 w-full bg-slate-950/80 flex items-center justify-center text-2xl border-b border-slate-850 shrink-0">
                          {isPokemon ? '⚡' : isTrainer ? '🧪' : '🔷'}
                        </div>
                      )}

                      {/* Content details */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between gap-2 bg-slate-900">
                        <div className="space-y-0.5">
                          <h6 className="text-[11px] font-bold text-white leading-tight truncate">
                            {item.meta.name}
                          </h6>
                          <div className="flex items-center gap-1">
                            {isPokemon ? (
                              <>
                                <span className={`text-[8px] font-black px-1 rounded-sm ${isBasic ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                  {stageText}
                                </span>
                                <span className={`text-[8px] font-bold ${typeColors.text}`}>
                                  {typeColors.symbol} {typeColors.ptName}
                                </span>
                              </>
                            ) : isTrainer ? (
                              <span className="text-[8px] font-black px-1 rounded-sm bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Treinador
                              </span>
                            ) : (
                              <span className="text-[8px] font-black px-1 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Energia
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RAPID INTERACTION ACTION BOX ON THE CARD */}
                        <div className="space-y-1 pt-1.5 border-t border-slate-850">
                          {isPokemon && (
                            <div className="grid grid-cols-2 gap-1">
                              <button
                                onClick={() => handleSetAsActive(item)}
                                disabled={!!activePokemon}
                                className="p-1 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 disabled:opacity-30 disabled:pointer-events-none text-purple-300 text-[8px] font-extrabold rounded flex items-center justify-center"
                              >
                                Ativo
                              </button>
                              <button
                                onClick={() => handlePutOnBench(item)}
                                disabled={benchPokemons.length >= (simSize === 5 ? 3 : 5)}
                                className="p-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/20 disabled:opacity-30 disabled:pointer-events-none text-indigo-300 text-[8px] font-extrabold rounded flex items-center justify-center"
                              >
                                Banco
                              </button>
                            </div>
                          )}

                          {isEnergy && (
                            <div className="space-y-1">
                              {activePokemon && (
                                <button
                                  onClick={() => handleAttachEnergyFromHand(item.uniqId, 'active')}
                                  className="w-full p-1 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/20 text-emerald-300 text-[8px] font-extrabold rounded"
                                >
                                  Anexar Ativo
                                </button>
                              )}
                              {benchPokemons.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {benchPokemons.map((b, bIdx) => (
                                    <button
                                      key={b.uniqId}
                                      onClick={() => handleAttachEnergyFromHand(item.uniqId, 'bench', bIdx)}
                                      className="flex-1 p-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] font-bold rounded"
                                      title={`Anexar ao Banco Slot #${bIdx + 1}`}
                                    >
                                      B{bIdx + 1}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {isTrainer && (
                            <button
                              onClick={() => handleDiscardFromHand(item)}
                              className="w-full p-1 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/20 text-blue-300 text-[8px] font-extrabold rounded"
                            >
                              Jogar Treinador
                            </button>
                          )}

                          <button
                            onClick={() => handleDiscardFromHand(item)}
                            className="w-full py-0.5 text-center text-slate-500 hover:text-red-400 text-[8px] font-medium block"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SIMULATION HISTORY, DISCARD PILE & ANALYTICS (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* HISTORICO */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-slate-400" />
                <span>Histórico de Ações</span>
              </h5>

              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar text-[10px] leading-relaxed">
                {simHistory.length === 0 ? (
                  <div className="text-slate-600 italic py-6 text-center">Nenhum evento registrado ainda.</div>
                ) : (
                  simHistory.map((hist, i) => {
                    let isAlert = hist.includes('sem Pokémons Básicos') || hist.includes('Mulligan') || hist.includes('Aviso');
                    let isSuccess = hist.includes('com sucesso') || hist.includes('Válida') || hist.includes('Promoveu') || hist.includes('Colocou');
                    
                    return (
                      <div 
                        key={i} 
                        className={`p-2 rounded-lg border text-slate-300 font-mono ${
                          isAlert 
                            ? 'bg-amber-950/20 border-amber-500/20 text-amber-300' 
                            : isSuccess 
                            ? 'bg-emerald-950/20 border-emerald-500/10 text-emerald-300' 
                            : 'bg-slate-900 border-slate-850 text-slate-400'
                        }`}
                      >
                        {hist}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* PILHA DE DESCARTE (DISCARD PILE) */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-3">
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Pilha de Descarte ({discardPile.length})</span>
              </h5>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {discardPile.length === 0 ? (
                  <div className="text-slate-600 text-[10px] italic text-center py-4">Nenhuma carta no descarte.</div>
                ) : (
                  discardPile.map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-1.5 bg-slate-900/60 rounded border border-slate-850 text-[10px]"
                    >
                      <span className="text-slate-300 font-bold truncate">{item.meta?.name || 'Desconhecido'}</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest px-1 py-0.5 rounded bg-slate-950">
                        {item.meta?.category || 'Carta'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* QUICK ANALYSIS TIP */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-3.5 space-y-2 text-[10px] leading-relaxed">
              <span className="font-extrabold text-white block">💡 Dica do Analista:</span>
              <p className="text-slate-400">
                Ao testar a abertura do seu deck, preste atenção em quantas vezes você consegue colocar um atacante Ativo e pelo menos 1 Pokémon de reserva no Banco de Reservas no Turno 1. Um setup consistente é a chave para vencer partidas rápidas!
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )}
</div>
  );
};

