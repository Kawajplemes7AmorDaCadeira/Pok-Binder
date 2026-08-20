import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sword,
  RotateCcw,
  Sparkles,
  Play,
  User,
  AlertTriangle,
  Zap,
  HelpCircle,
  Eye,
  Check,
  Search,
  BookOpen,
  Trophy,
  Coins,
  Award,
  ChevronRight,
  ArrowRight,
  Lock,
  Gamepad2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Gift,
} from 'lucide-react';
import { CardProvider } from '../services/cardProvider';
import { StorageService } from '../services/storage';
import { CardLanguage, Deck, PokemonCard } from '../types';
import { GameEngine } from '../battle-engine/GameEngine';
import { RuleEngine, isBasicCard } from '../battle-engine/RuleEngine';
import { GameState, GameAction, PlayerId, CardInstance, PokemonInPlay } from '../battle-engine/types';
import { CardImage } from './CardImage';
import { formatCardImageUrl } from '../services/tcgdex';

interface PlaytestArenaProps {
  preferredLanguage: CardLanguage;
  onSelectCard?: (card: PokemonCard) => void;
}

// Custom TCG Live Championship Cups list
const CHAMPIONSHIP_CUPS = [
  {
    id: 'paldea',
    name: 'Copa Regional de Paldea',
    tier: 'Iniciante',
    tierColor: 'from-emerald-600 to-teal-500',
    borderGlow: 'border-emerald-500/30 shadow-emerald-950/20',
    badge: '🟢',
    eloReq: 0,
    entryFee: 0,
    opponents: {
      quarter: { name: 'Treinador Lucas', elo: 420, avatar: '👦', deckName: 'Choque de Pikachu', icon: '⚡' },
      semi: { name: 'Sofia (Líder)', elo: 480, avatar: '👩', deckName: 'Vento de Wartortle', icon: '💧' },
      final: { name: 'Mestre Bruno', elo: 550, avatar: '👨', deckName: 'Blastoise ex Inundação', icon: '🐢' },
    },
    rewards: { coins: 150, elo: 40, pack: 'Escarlate e Violeta: 151' }
  },
  {
    id: 'elite',
    name: 'Liga de Elite do TCG',
    tier: 'Desafiante',
    tierColor: 'from-blue-600 to-indigo-500',
    borderGlow: 'border-blue-500/30 shadow-blue-950/20',
    badge: '🔵',
    eloReq: 450,
    entryFee: 50,
    opponents: {
      quarter: { name: 'Igor Tempest', elo: 620, avatar: '🧑‍🎤', deckName: 'Fúria de Fogo Charmander', icon: '🔥' },
      semi: { name: 'Camila Mist', elo: 740, avatar: '💁‍♀️', deckName: 'Evolução Doce Doce', icon: '🍬' },
      final: { name: 'Cynthia (Campeã)', elo: 880, avatar: '👸', deckName: 'Charizard ex Labareda', icon: '🐉' },
    },
    rewards: { coins: 350, elo: 80, pack: 'Obsidian Flames' }
  },
  {
    id: 'worlds',
    name: 'Campeonato Mundial TCG Live',
    tier: 'Mestre Global',
    tierColor: 'from-purple-600 to-pink-500',
    borderGlow: 'border-purple-500/30 shadow-purple-950/20',
    badge: '🏆',
    eloReq: 800,
    entryFee: 150,
    opponents: {
      quarter: { name: 'Hiroshi (Japão)', elo: 980, avatar: '🥋', deckName: 'Estratégia Iono Control', icon: '🧿' },
      semi: { name: 'Sarah (EUA)', elo: 1150, avatar: '👩‍🎤', deckName: 'Soberania Blastoise', icon: '🌊' },
      final: { name: 'Satoshi (Lenda)', elo: 1350, avatar: '🧢', deckName: 'Supremacia Charizard ex', icon: '👑' },
    },
    rewards: { coins: 800, elo: 150, pack: 'Crown Zenith Premium' }
  }
];

// High-tier reward pool for Booster opening simulation
const BOOSTER_PULL_POOL: Record<string, Array<{ name: string; r: string; img: string; t: string; hp: number; attacks: any[] }>> = {
  'Escarlate e Violeta: 151': [
    { name: 'Charizard ex', r: 'SAR Gold', img: 'https://assets.tcgdex.net/pt/sv/sv03.5/199', t: 'Fire', hp: 330, attacks: [{ name: 'Burning Darkness', damage: '180' }] },
    { name: 'Blastoise ex', r: 'SAR Gold', img: 'https://assets.tcgdex.net/pt/sv/sv03.5/200', t: 'Water', hp: 340, attacks: [{ name: 'Twin Cannons', damage: '140' }] },
    { name: 'Venusaur ex', r: 'SAR Gold', img: 'https://assets.tcgdex.net/pt/sv/sv03.5/198', t: 'Grass', hp: 340, attacks: [{ name: 'Giant Bloom', damage: '150' }] },
    { name: 'Mew ex', r: 'Ultra Rare', img: 'https://assets.tcgdex.net/pt/sv/sv03.5/151', t: 'Psychic', hp: 180, attacks: [{ name: 'Genome Hack', damage: '?' }] },
    { name: 'Pikachu', r: 'Illustration Rare', img: 'https://assets.tcgdex.net/pt/sv/sv03.5/173', t: 'Lightning', hp: 60, attacks: [{ name: 'Charge', damage: '10' }] },
  ],
  'Obsidian Flames': [
    { name: 'Charizard ex', r: 'Terastal Gold', img: 'https://assets.tcgdex.net/pt/sv/sv03/223', t: 'Dark', hp: 330, attacks: [{ name: 'Burning Darkness', damage: '180' }] },
    { name: 'Pidgeot ex', r: 'Ultra Rare', img: 'https://assets.tcgdex.net/pt/sv/sv03/225', t: 'Colorless', hp: 280, attacks: [{ name: 'Blustery Wind', damage: '120' }] },
    { name: 'Ninetales ex', r: 'Double Rare', img: 'https://assets.tcgdex.net/pt/sv/sv03/038', t: 'Fire', hp: 260, attacks: [{ name: 'Heat Wave', damage: '30' }] },
    { name: 'Gloom', r: 'Art Rare', img: 'https://assets.tcgdex.net/pt/sv/sv03/198', t: 'Grass', hp: 80, attacks: [{ name: 'Drool', damage: '30' }] },
    { name: 'Cleffa', r: 'Art Rare', img: 'https://assets.tcgdex.net/pt/sv/sv03/202', t: 'Psychic', hp: 30, attacks: [{ name: 'Grasp', damage: '10' }] },
  ],
  'Crown Zenith Premium': [
    { name: 'Arceus VSTAR', r: 'Gold UR', img: 'https://assets.tcgdex.net/pt/swsh/swsh12.5/GG70', t: 'Colorless', hp: 280, attacks: [{ name: 'Trinity Nova', damage: '200' }] },
    { name: 'Giratina VSTAR', r: 'Gold UR', img: 'https://assets.tcgdex.net/pt/swsh/swsh12.5/GG69', t: 'Dragon', hp: 280, attacks: [{ name: 'Lost Impact', damage: '280' }] },
    { name: 'Dialga VSTAR', r: 'Gold UR', img: 'https://assets.tcgdex.net/pt/swsh/swsh12.5/GG68', t: 'Metal', hp: 280, attacks: [{ name: 'Metal Blast', damage: '40' }] },
    { name: 'Palkia VSTAR', r: 'Gold UR', img: 'https://assets.tcgdex.net/pt/swsh/swsh12.5/GG67', t: 'Water', hp: 280, attacks: [{ name: 'Subspace Swell', damage: '60' }] },
    { name: 'Mewtwo VSTAR', r: 'Gallery Secret', img: 'https://assets.tcgdex.net/pt/swsh/swsh12.5/GG44', t: 'Psychic', hp: 280, attacks: [{ name: 'Psy Purge', damage: '90' }] },
  ],
};

// Preset Starter Deck Cards (Same Fire & Water base for reliable simulation matches)
const PRESET_STARTER_DECK_CARDS = [
  { id: 'charizard-ex', name: 'Charizard ex', hp: 330, types: ['Fire'], category: 'Pokemon', rarity: 'Special Illustration Rare', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/199', attacks: [{ name: 'Burning Darkness', cost: ['Fire', 'Fire'], damage: '180', effect: 'Burning destruction.' }] },
  { id: 'charmander-1', name: 'Charmander', hp: 70, types: ['Fire'], category: 'Pokemon', rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/004', attacks: [{ name: 'Ember', cost: ['Fire'], damage: '30' }] },
  { id: 'charmander-2', name: 'Charmander', hp: 70, types: ['Fire'], category: 'Pokemon', rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/004', attacks: [{ name: 'Ember', cost: ['Fire'], damage: '30' }] },
  { id: 'charmander-3', name: 'Charmander', hp: 70, types: ['Fire'], category: 'Pokemon', rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/004', attacks: [{ name: 'Ember', cost: ['Fire'], damage: '30' }] },
  { id: 'charmander-4', name: 'Charmander', hp: 70, types: ['Fire'], category: 'Pokemon', rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/004', attacks: [{ name: 'Ember', cost: ['Fire'], damage: '30' }] },
  { id: 'charmeleon-1', name: 'Charmeleon', hp: 90, types: ['Fire'], category: 'Pokemon', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/005', attacks: [{ name: 'Fire Blast', cost: ['Fire', 'Fire'], damage: '90' }] },
  { id: 'charmeleon-2', name: 'Charmeleon', hp: 90, types: ['Fire'], category: 'Pokemon', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/005', attacks: [{ name: 'Fire Blast', cost: ['Fire', 'Fire'], damage: '90' }] },

  { id: 'blastoise-ex', name: 'Blastoise ex', hp: 340, types: ['Water'], category: 'Pokemon', rarity: 'Special Illustration Rare', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/200', attacks: [{ name: 'Twin Cannons', cost: ['Water', 'Water'], damage: '140', effect: 'Double water blast.' }] },
  { id: 'squirtle-1', name: 'Squirtle', hp: 60, types: ['Water'], category: 'Pokemon', rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/007', attacks: [{ name: 'Water Splash', cost: ['Water'], damage: '20' }] },
  { id: 'squirtle-2', name: 'Squirtle', hp: 60, types: ['Water'], category: 'Pokemon', rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/007', attacks: [{ name: 'Water Splash', cost: ['Water'], damage: '20' }] },
  { id: 'squirtle-3', name: 'Squirtle', hp: 60, types: ['Water'], category: 'Pokemon', rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/007', attacks: [{ name: 'Water Splash', cost: ['Water'], damage: '20' }] },
  { id: 'squirtle-4', name: 'Squirtle', hp: 60, types: ['Water'], category: 'Pokemon', rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/007', attacks: [{ name: 'Water Splash', cost: ['Water'], damage: '20' }] },
  { id: 'wartortle-1', name: 'Wartortle', hp: 90, types: ['Water'], category: 'Pokemon', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/008', attacks: [{ name: 'Freezing Wind', cost: ['Water', 'Water'], damage: '70' }] },
  { id: 'wartortle-2', name: 'Wartortle', hp: 90, types: ['Water'], category: 'Pokemon', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/008', attacks: [{ name: 'Freezing Wind', cost: ['Water', 'Water'], damage: '70' }] },

  { id: 'ultra-ball-1', name: 'Ultra Ball', category: 'Trainer', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv01/196', rules: ['Discard 2 cards to search your deck for any Pokémon.'] },
  { id: 'ultra-ball-2', name: 'Ultra Ball', category: 'Trainer', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv01/196', rules: ['Discard 2 cards to search your deck for any Pokémon.'] },
  { id: 'nest-ball-1', name: 'Nest Ball', category: 'Trainer', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv01/181', rules: ['Search your deck for a Basic Pokémon and put it onto your Bench.'] },
  { id: 'nest-ball-2', name: 'Nest Ball', category: 'Trainer', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv01/181', rules: ['Search your deck for a Basic Pokémon and put it onto your Bench.'] },
  { id: 'rare-candy-1', name: 'Rare Candy', category: 'Trainer', rarity: 'Uncommon', image: 'https://assets.tcgdex.net/pt/sv/sv01/191', rules: ['Evolve 1 of your Basic Pokémon in play directly to a Stage 2 Pokémon.'] },
  { id: 'prof-research-1', name: 'Prof. Research', category: 'Trainer', rarity: 'Rare', image: 'https://assets.tcgdex.net/pt/sv/sv01/189', rules: ['Discard your hand and draw 7 cards.'] },
  { id: 'prof-research-2', name: 'Prof. Research', category: 'Trainer', rarity: 'Rare', image: 'https://assets.tcgdex.net/pt/sv/sv01/189', rules: ['Discard your hand and draw 7 cards.'] },
  { id: 'iono-1', name: 'Iono', category: 'Trainer', rarity: 'Rare', image: 'https://assets.tcgdex.net/pt/sv/sv02/185', rules: ['Shuffle hands into deck and draw equal to prizes.'] },

  { id: 'energy-fire-1', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-2', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-3', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-4', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-5', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-6', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-7', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-8', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-9', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-10', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-11', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },
  { id: 'energy-fire-12', name: 'Fire Energy', category: 'Energy', types: ['Fire'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/203' },

  { id: 'energy-water-1', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-2', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-3', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-4', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-5', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-6', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-7', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-8', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-9', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-10', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-11', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
  { id: 'energy-water-12', name: 'Water Energy', category: 'Energy', types: ['Water'], rarity: 'Common', image: 'https://assets.tcgdex.net/pt/sv/sv03.5/204' },
];

export const PlaytestArena: React.FC<PlaytestArenaProps> = ({
  preferredLanguage,
  onSelectCard,
}) => {
  // AVAILABLE PLAYER DECKS
  const [availableDecks, setAvailableDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('preset');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // COPA TCG LIVE PERSISTED STATE
  const [ladderState, setLadderState] = useState(() => {
    try {
      const saved = localStorage.getItem('tcg_live_ladder_progress');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      elo: 400, // Poké Ball tier
      coins: 200,
      wonCups: [] as string[],
      activeCupId: null as string | null,
      cupRound: 'lobby' as 'lobby' | 'quarter' | 'semi' | 'final' | 'victory_claim',
      boosterInventory: [] as string[], // Earned packs awaiting reveal!
    };
  });

  // Save progress
  useEffect(() => {
    localStorage.setItem('tcg_live_ladder_progress', JSON.stringify(ladderState));
  }, [ladderState]);

  // Game UI states
  const [selectedHandCard, setSelectedHandCard] = useState<CardInstance | null>(null);
  const [isFlippingCoin, setIsFlippingCoin] = useState(false);
  const [coinResult, setCoinResult] = useState<'CARA' | 'COROA' | null>(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  const [diceResult, setDiceResult] = useState<number | null>(null);

  // Deck Examiner
  const [isSearchingDeck, setIsSearchingDeck] = useState(false);
  const [searchFilterCategory, setSearchFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // AI interactive emotes/dialogues
  const [aiDialogue, setAiDialogue] = useState<string>('Bem-vindo à Arena! Boa sorte na copa!');
  const [showAiDialogue, setShowAiDialogue] = useState(true);

  // Booster pack open screen state
  const [activeBoosterToOpen, setActiveBoosterToOpen] = useState<string | null>(null);
  const [boosterOpenState, setBoosterOpenState] = useState<'closed' | 'tearing' | 'revealed'>('closed');
  const [revealedBoosterCards, setRevealedBoosterCards] = useState<any[]>([]);
  const [flippedBoosterIndices, setFlippedBoosterIndices] = useState<number[]>([]);

  // Load custom decks
  useEffect(() => {
    const decks = StorageService.getDecks();
    setAvailableDecks(decks);
  }, []);

  const triggerAiDialogue = (text: string) => {
    setAiDialogue(text);
    setShowAiDialogue(true);
    setTimeout(() => {
      // Keep dialogue visible or let it fade
    }, 4500);
  };

  // ----------------------------------------------------
  // ADVANCED AI AUTOMATION MACHINE FOR P2
  // Runs whenever gameState is active and activePlayer is 'P2'
  // ----------------------------------------------------
  useEffect(() => {
    if (!gameState || gameState.winner || gameState.activePlayer !== 'P2') return;

    const currentCup = CHAMPIONSHIP_CUPS.find(c => c.id === ladderState.activeCupId);
    const opponentName = currentCup 
      ? currentCup.opponents[ladderState.cupRound as 'quarter' | 'semi' | 'final']?.name || 'Inimigo'
      : 'Treinador de Treino';

    const timer = setTimeout(() => {
      const p2 = gameState.players.P2;

      // 1. If in start phase, auto-draw card
      if (gameState.phase === 'TURN_START') {
        dispatchAction({ type: 'DRAW_CARD', player: 'P2' });
        triggerAiDialogue(`${opponentName}: Comprando minha carta de turno... Vamos ver.`);
        return;
      }

      // 2. Play basic pokemon from hand to empty bench slots
      if (p2.bench.length < 5) {
        const basicInHand = p2.hand.find((c) => c.card.category === 'Pokemon' && isBasicCard(c.card));
        if (basicInHand) {
          dispatchAction({
            type: 'PLAY_BASIC',
            player: 'P2',
            cardId: basicInHand.instanceId,
            targetBenchIndex: p2.bench.length,
          });
          triggerAiDialogue(`${opponentName}: Invocando ${basicInHand.card.name} para o meu Banco de Reservas!`);
          return;
        }
      }

      // 3. Attach Energy to Active if hasn't attached yet
      if (!p2.energyAttachedThisTurn && p2.active) {
        const energyInHand = p2.hand.find((c) => c.card.category === 'Energy');
        if (energyInHand) {
          dispatchAction({
            type: 'ATTACH_ENERGY',
            player: 'P2',
            cardId: energyInHand.instanceId,
            targetId: p2.active.instanceId,
          });
          triggerAiDialogue(`${opponentName}: Ligando uma ${energyInHand.card.name} no meu Pokémon Ativo.`);
          return;
        }
      }

      // 4. Try to evolve active Pokémon if compatible
      if (p2.active) {
        const activeTopCard = p2.active.evolutionStack[p2.active.evolutionStack.length - 1].card;
        const evolutionInHand = p2.hand.find((c) => {
          if (c.card.category !== 'Pokemon') return false;
          const baseName = activeTopCard.name.toLowerCase();
          const evoName = c.card.name.toLowerCase();
          if (baseName.includes('charmander') && evoName.includes('charmeleon')) return true;
          if (baseName.includes('charmeleon') && (evoName.includes('charizard') || evoName.includes('charizard ex'))) return true;
          if (baseName.includes('squirtle') && evoName.includes('wartortle')) return true;
          if (baseName.includes('wartortle') && (evoName.includes('blastoise') || evoName.includes('blastoise ex'))) return true;
          return false;
        });

        if (evolutionInHand) {
          dispatchAction({
            type: 'EVOLVE',
            player: 'P2',
            cardId: evolutionInHand.instanceId,
            targetId: p2.active.instanceId,
          });
          triggerAiDialogue(`${opponentName}: Incrível! O meu Pokémon Ativo evolui para ${evolutionInHand.card.name}! 🔥`);
          return;
        }
      }

      // 5. Play trainer support cards to loop or draw
      const trainerInHand = p2.hand.find((c) => c.card.category === 'Trainer');
      if (trainerInHand && !p2.supporterPlayedThisTurn) {
        dispatchAction({
          type: 'PLAY_TRAINER',
          player: 'P2',
          cardId: trainerInHand.instanceId,
        });
        triggerAiDialogue(`${opponentName}: Ativando a carta de Treinador [${trainerInHand.card.name}]!`);
        return;
      }

      // 6. Look for attacks on active Pokémon
      if (p2.active) {
        const activeTopCard = p2.active.evolutionStack[p2.active.evolutionStack.length - 1].card;
        const attacks = activeTopCard.attacks || [];
        const usableAttack = attacks.find((atk) =>
          RuleEngine.canPayAttackCost(p2.active!, atk.cost || [])
        );

        if (usableAttack) {
          dispatchAction({
            type: 'ATTACK',
            player: 'P2',
            attackId: usableAttack.name,
          });
          triggerAiDialogue(`${opponentName}: Prepare-se! ${activeTopCard.name} usa o ataque [ ${usableAttack.name} ]! 💥`);
          return;
        }
      }

      // 7. Nothing left to do, Pass Turn
      dispatchAction({ type: 'END_TURN', player: 'P2' });
      triggerAiDialogue(`${opponentName}: Terminei minhas jogadas. Sua vez!`);
    }, 1500);

    return () => clearTimeout(timer);
  }, [gameState]);

  // ----------------------------------------------------
  // CHECK GAME WINNER & PROGRESS CUP ROUNDS
  // ----------------------------------------------------
  useEffect(() => {
    if (gameState && gameState.winner) {
      const winnerId = gameState.winner;
      
      if (winnerId === 'P1') {
        // Player 1 won!
        const currentCup = CHAMPIONSHIP_CUPS.find((c) => c.id === ladderState.activeCupId);
        
        if (currentCup) {
          if (ladderState.cupRound === 'quarter') {
            // Advancing to semi
            setLadderState(prev => ({
              ...prev,
              elo: prev.elo + 30,
              coins: prev.coins + 50,
              cupRound: 'semi'
            }));
            triggerAiDialogue(`Parabéns! Você avançou para as Semifinais da ${currentCup.name}!`);
          } else if (ladderState.cupRound === 'semi') {
            // Advancing to final
            setLadderState(prev => ({
              ...prev,
              elo: prev.elo + 40,
              coins: prev.coins + 100,
              cupRound: 'final'
            }));
            triggerAiDialogue(`Sensacional! Você alcançou a Grande Final da ${currentCup.name}! Prepare-se para o campeão!`);
          } else if (ladderState.cupRound === 'final') {
            // Champion of the cup! Award pack & trophy!
            const nextPacks = [...ladderState.boosterInventory, currentCup.rewards.pack];
            const nextWonCups = [...ladderState.wonCups];
            if (!nextWonCups.includes(currentCup.id)) {
              nextWonCups.push(currentCup.id);
            }

            setLadderState(prev => ({
              ...prev,
              elo: prev.elo + currentCup.rewards.elo,
              coins: prev.coins + currentCup.rewards.coins,
              wonCups: nextWonCups,
              boosterInventory: nextPacks,
              cupRound: 'victory_claim'
            }));
            triggerAiDialogue(`🏆 INCRÍVEL! Você se consagrou Campeão da ${currentCup.name}! Um Booster de ${currentCup.rewards.pack} foi adicionado à sua conta.`);
          }
        } else {
          // Normal friendly match
          setLadderState(prev => ({ ...prev, elo: prev.elo + 15, coins: prev.coins + 25 }));
        }
      } else {
        // Player 1 lost
        setLadderState(prev => ({
          ...prev,
          elo: Math.max(400, prev.elo - 15) // prevent dropping below start 400 elo
        }));
        triggerAiDialogue("Você foi derrotado! Mas não desista, tente novamente nesta mesma rodada!");
      }
    }
  }, [gameState?.winner]);

  // Start a tournament/match setup
  const handleStartPlaytest = async () => {
    setErrorMessage(null);
    let player1DeckCards: PokemonCard[] = [];
    let player2DeckCards: PokemonCard[] = [];

    // Create custom base cards from starter deck array
    const presetCards: PokemonCard[] = PRESET_STARTER_DECK_CARDS.map((c) => ({
      id: c.id,
      localId: c.id,
      name: c.name,
      hp: c.hp,
      types: c.types,
      category: c.category,
      rarity: c.rarity,
      image: c.image,
      attacks: c.attacks,
      rules: c.rules,
      setName: 'Starter Deck',
      setId: 'starter',
      language: preferredLanguage,
    }));

    if (selectedDeckId === 'preset') {
      player1DeckCards = [...presetCards];
    } else {
      const foundDeck = availableDecks.find((d) => d.id === selectedDeckId);
      if (foundDeck && foundDeck.cards.length > 0) {
        const cardIds = foundDeck.cards.map((c) => c.cardId);
        const metadata = await CardProvider.getCardsByIds(cardIds, preferredLanguage);
        foundDeck.cards.forEach((dc) => {
          const meta = metadata[dc.cardId];
          if (meta) {
            for (let i = 0; i < dc.quantity; i++) {
              player1DeckCards.push({ ...meta });
            }
          }
        });
      } else {
        player1DeckCards = [...presetCards];
      }
    }

    // Opponent uses standard starter deck
    player2DeckCards = [...presetCards];

    const currentCup = CHAMPIONSHIP_CUPS.find((c) => c.id === ladderState.activeCupId);
    const opponentName = currentCup 
      ? `${currentCup.opponents[ladderState.cupRound as 'quarter' | 'semi' | 'final']?.name || 'P2'} (${currentCup.opponents[ladderState.cupRound as 'quarter' | 'semi' | 'final']?.deckName || 'Mesa'})`
      : 'Treinador Convidado';

    const createdState = GameEngine.createGame(
      player1DeckCards,
      player2DeckCards,
      'Jogador P1 (Você)',
      opponentName
    );

    setGameState(createdState);
    triggerAiDialogue(`A rodada começou! Vamos lutar com honra pelos prêmios!`);
  };

  const dispatchAction = (action: GameAction) => {
    if (!gameState) return;
    setErrorMessage(null);

    const result = GameEngine.dispatch(gameState, action);
    if (result.success) {
      setGameState(result.state);
      setSelectedHandCard(null);
    } else {
      setErrorMessage(result.error || 'Jogada inválida!');
      const updatedState = { ...gameState };
      updatedState.history.unshift({
        type: 'LOG_MESSAGE',
        message: `⚠️ Infração de Regra: ${result.error}`,
      });
      setGameState(updatedState);
    }
  };

  const handleSelectHandCard = (instance: CardInstance) => {
    if (selectedHandCard?.instanceId === instance.instanceId) {
      setSelectedHandCard(null);
    } else {
      setSelectedHandCard(instance);
    }
  };

  const handleTargetPokemon = (targetId: string) => {
    if (!selectedHandCard || !gameState) return;

    if (selectedHandCard.card.category === 'Energy') {
      dispatchAction({
        type: 'ATTACH_ENERGY',
        player: gameState.activePlayer,
        cardId: selectedHandCard.instanceId,
        targetId,
      });
    } else if (selectedHandCard.card.category === 'Pokemon') {
      dispatchAction({
        type: 'EVOLVE',
        player: gameState.activePlayer,
        cardId: selectedHandCard.instanceId,
        targetId,
      });
    }
  };

  const handleSelectCardFromDeckSearch = (instanceId: string) => {
    if (!gameState) return;
    const player = gameState.players[gameState.activePlayer];
    const foundIdx = player.deck.findIndex((c) => c.instanceId === instanceId);
    
    if (foundIdx >= 0) {
      const card = player.deck[foundIdx];
      player.deck.splice(foundIdx, 1);
      player.hand.push(card);
      
      gameState.history.unshift({
        type: 'LOG_MESSAGE',
        message: `🔍 Busca: Pegou ${card.card.name} do deck.`,
      });

      setGameState({ ...gameState });
      setIsSearchingDeck(false);
    }
  };

  const handleCoinFlip = () => {
    if (isFlippingCoin) return;
    setIsFlippingCoin(true);
    setCoinResult(null);

    setTimeout(() => {
      const res = Math.random() > 0.5 ? 'CARA' : 'COROA';
      setCoinResult(res);
      setIsFlippingCoin(false);
      
      if (gameState) {
        gameState.history.unshift({
          type: 'LOG_MESSAGE',
          message: `🪙 Moeda Holográfica: Deu [ ${res} ]!`,
        });
        setGameState({ ...gameState });
      }
    }, 850);
  };

  const handleDiceRoll = () => {
    if (isRollingDice) return;
    setIsRollingDice(true);
    setDiceResult(null);

    setTimeout(() => {
      const res = Math.floor(Math.random() * 6) + 1;
      setDiceResult(res);
      setIsRollingDice(false);

      if (gameState) {
        gameState.history.unshift({
          type: 'LOG_MESSAGE',
          message: `🎲 Rolagem de Dado: Resultado [ ${res} ]!`,
        });
        setGameState({ ...gameState });
      }
    }, 850);
  };

  // Helper to determine active league ranking tier name and color
  const getLeagueTier = (elo: number) => {
    if (elo >= 1200) return { name: 'Liga Mestre Arceus', color: 'text-amber-400 bg-amber-950/40 border-amber-500/50', icon: '👑' };
    if (elo >= 1000) return { name: 'Liga Master-bola', color: 'text-purple-400 bg-purple-950/40 border-purple-500/50', icon: '🟣' };
    if (elo >= 800) return { name: 'Liga Ultra-bola', color: 'text-orange-400 bg-orange-950/40 border-orange-500/50', icon: '🟠' };
    if (elo >= 600) return { name: 'Liga Superbola', color: 'text-sky-400 bg-sky-950/40 border-sky-500/50', icon: '🔵' };
    return { name: 'Liga Pokébola', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/50', icon: '🟢' };
  };

  // ----------------------------------------------------
  // INTERACTIVE BOOSTER PACK OPENER SIMULATOR
  // ----------------------------------------------------
  const triggerOpenBooster = (packName: string) => {
    setActiveBoosterToOpen(packName);
    setBoosterOpenState('closed');
    setFlippedBoosterIndices([]);
    
    // Pick 5 random cards from the pool for that pack
    const pool = BOOSTER_PULL_POOL[packName] || BOOSTER_PULL_POOL['Escarlate e Violeta: 151'];
    const draws: any[] = [];
    for (let i = 0; i < 5; i++) {
      const randomCard = pool[Math.floor(Math.random() * pool.length)];
      draws.push(randomCard);
    }
    setRevealedBoosterCards(draws);
  };

  const handleRipBooster = () => {
    setBoosterOpenState('tearing');
    setTimeout(() => {
      setBoosterOpenState('revealed');
    }, 1200);
  };

  const flipBoosterCard = (index: number) => {
    if (flippedBoosterIndices.includes(index)) return;
    setFlippedBoosterIndices([...flippedBoosterIndices, index]);
  };

  const finishBoosterOpening = () => {
    // Remove one pack of this kind from inventory
    const idx = ladderState.boosterInventory.indexOf(activeBoosterToOpen || '');
    const nextInventory = [...ladderState.boosterInventory];
    if (idx >= 0) {
      nextInventory.splice(idx, 1);
    }

    setLadderState(prev => ({
      ...prev,
      boosterInventory: nextInventory
    }));
    setActiveBoosterToOpen(null);
  };

  const isCompatibleWithActive = (selected: CardInstance | null, active: PokemonInPlay | null) => {
    if (!selected || !active || !gameState) return false;
    if (selected.card.category === 'Energy') {
      const validation = RuleEngine.validate(gameState, {
        type: 'ATTACH_ENERGY',
        player: gameState.activePlayer,
        cardId: selected.instanceId,
        targetId: active.instanceId,
      });
      return validation.valid;
    }
    if (selected.card.category === 'Pokemon') {
      const validation = RuleEngine.validate(gameState, {
        type: 'EVOLVE',
        player: gameState.activePlayer,
        cardId: selected.instanceId,
        targetId: active.instanceId,
      });
      return validation.valid;
    }
    return false;
  };

  const isCompatibleWithBench = (selected: CardInstance | null, bench: PokemonInPlay) => {
    return isCompatibleWithActive(selected, bench);
  };

  const currentCup = CHAMPIONSHIP_CUPS.find((c) => c.id === ladderState.activeCupId);
  const nextOpponent = currentCup && ladderState.cupRound !== 'victory_claim' && ladderState.cupRound !== 'lobby'
    ? currentCup.opponents[ladderState.cupRound as 'quarter' | 'semi' | 'final']
    : null;

  const currentTierInfo = getLeagueTier(ladderState.elo);

  return (
    <div className="space-y-6 select-none" id="tcg-live-cup-arena-container">
      
      {/* 1. LADDER PROGRESS BAR HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black bg-red-600 text-white px-2 py-0.5 rounded tracking-widest">
                TEMPORADA COPA TCG LIVE
              </span>
              <span className="text-[10px] text-yellow-400 font-black tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> PRO LIVE LEAGUE
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Copa do Jogo Pokémon TCG Live
            </h2>
            <p className="text-xs text-slate-400">
              Desafie oponentes de elite, suba o seu ELO no ranking e rasgue boosters reais para expandir sua coleção!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-850 w-full md:w-auto justify-between md:justify-end">
            <div className="text-center md:text-right">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Seu Ranking ELO</span>
              <div className="flex items-center gap-1.5 justify-center md:justify-end mt-0.5">
                <span className="text-lg">{currentTierInfo.icon}</span>
                <span className="text-xl font-black text-white font-mono">{ladderState.elo} pts</span>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${currentTierInfo.color} inline-block mt-1`}>
                {currentTierInfo.name}
              </span>
            </div>

            <div className="h-10 w-px bg-slate-800 hidden sm:block" />

            <div className="text-center md:text-left">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Créditos de Liga</span>
              <div className="flex items-center gap-1.5 justify-center md:justify-start mt-0.5 text-yellow-400">
                <Coins className="w-5 h-5" />
                <span className="text-xl font-black font-mono">{ladderState.coins}</span>
              </div>
              <span className="text-[9px] text-slate-500 font-bold block mt-1">Gaste em Inscrições</span>
            </div>

            {ladderState.boosterInventory.length > 0 && (
              <>
                <div className="h-10 w-px bg-slate-800 hidden sm:block" />
                <div className="text-center bg-sky-950/40 border border-sky-850 p-2 rounded-xl animate-pulse">
                  <span className="text-[9px] text-sky-400 uppercase font-black tracking-wider block">Pacotes para Abrir</span>
                  <button 
                    onClick={() => triggerOpenBooster(ladderState.boosterInventory[0])}
                    className="flex items-center gap-1 mt-1 text-xs font-black text-white bg-sky-600 hover:bg-sky-500 px-3 py-1 rounded-lg transition-all"
                  >
                    <Gift className="w-3.5 h-3.5" /> Abrir ({ladderState.boosterInventory.length})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. CHOOSE SCREEN VIEWS */}
      {activeBoosterToOpen ? (
        /* ======================== BOOSTER OPENER VIEW ======================== */
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 text-center max-w-4xl mx-auto space-y-8 shadow-2xl relative"
        >
          <div className="absolute top-4 right-4">
            <button 
              onClick={finishBoosterOpening}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-all"
            >
              Sair e Guardar
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block">Simulador de Pacotes</span>
            <h3 className="text-2xl font-black text-white">Pacote {activeBoosterToOpen}</h3>
            <p className="text-xs text-slate-400">Abra o seu booster e clique para revelar cartas holográficas e ex raras!</p>
          </div>

          {boosterOpenState === 'closed' && (
            <div className="py-12 max-w-sm mx-auto space-y-6">
              {/* Beautiful foil pack cover */}
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 1 }}
                className="aspect-[3/4.2] w-64 bg-gradient-to-tr from-sky-500 via-purple-600 to-red-500 rounded-2xl mx-auto shadow-2xl border-4 border-slate-300 relative overflow-hidden flex flex-col justify-between p-4 cursor-pointer"
                onClick={handleRipBooster}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/30 via-transparent to-transparent opacity-60" />
                <div className="absolute -inset-x-20 top-0 h-4 bg-slate-300 shadow-md transform -skew-y-3" />
                
                <div className="relative text-center space-y-1 mt-4">
                  <span className="text-[10px] font-black tracking-widest bg-slate-950/60 px-2 py-0.5 rounded text-white block mx-auto w-max">T&C LIVE SPECIAL</span>
                  <h4 className="text-lg font-black text-white leading-tight drop-shadow-md">EXPANSÃO DE ELITE</h4>
                  <p className="text-[8px] font-bold text-white/80">CONTEÚDO DE ALTA CATEGORIA</p>
                </div>

                <div className="w-20 h-20 rounded-full bg-slate-950/80 border-2 border-yellow-400 flex items-center justify-center mx-auto text-yellow-400 text-3xl font-black shadow-lg animate-pulse">
                  TCG
                </div>

                <div className="relative text-center text-[10px] font-black text-white/90 uppercase tracking-widest bg-slate-950/40 p-1.5 rounded-xl">
                  Clique para Rasgar!
                </div>
              </motion.div>

              <button 
                onClick={handleRipBooster}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-black uppercase tracking-wider hover:brightness-110 shadow-lg shadow-sky-600/20 active:scale-95 transition-all"
              >
                ⚡ Rasgar Embrulho de Alumínio
              </button>
            </div>
          )}

          {boosterOpenState === 'tearing' && (
            <div className="py-24 space-y-4">
              <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-sky-400 animate-pulse uppercase tracking-widest">Abrindo booster... Brilhos e energias se misturando!</p>
            </div>
          )}

          {boosterOpenState === 'revealed' && (
            <div className="space-y-8 py-6">
              {/* Revealed cards row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-center items-center">
                {revealedBoosterCards.map((card, idx) => {
                  const isFlipped = flippedBoosterIndices.includes(idx);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => flipBoosterCard(idx)}
                      className="aspect-[3/4.2] w-full max-w-[150px] mx-auto cursor-pointer relative perspective-1000 group"
                    >
                      <motion.div 
                        initial={false}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="w-full h-full transform-style-3d relative"
                      >
                        {/* CARD BACK */}
                        <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl bg-gradient-to-br from-blue-900 to-indigo-950 border-2 border-blue-500 shadow-xl flex flex-col justify-between p-3">
                          <div className="w-full h-full border border-sky-500/10 rounded-lg flex flex-col justify-between p-2 items-center">
                            <span className="text-[10px] font-black text-sky-400/80 tracking-widest">POKÉMON</span>
                            <div className="w-8 h-8 rounded-full bg-slate-950/80 border border-yellow-400/40 flex items-center justify-center text-yellow-400 font-bold text-xs">
                              ?
                            </div>
                            <span className="text-[7px] font-black text-slate-500 uppercase">REVEAL ME</span>
                          </div>
                        </div>

                        {/* CARD FRONT */}
                        <div className="absolute inset-0 w-full h-full backface-hidden rotateY-180 rounded-xl overflow-hidden border-2 border-yellow-400/40 shadow-xl flex flex-col justify-between bg-slate-900">
                          <div className="relative w-full h-full">
                            <CardImage 
                              card={{ name: card.name, image: card.img } as any}
                              src={formatCardImageUrl(card.img)}
                              alt={card.name}
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Rare foil glow filter */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/10 via-pink-500/5 to-sky-500/15 mix-blend-color-dodge opacity-80 pointer-events-none" />
                            
                            <div className="absolute top-1 left-1 bg-slate-950/95 px-1.5 py-0.5 rounded text-[7px] font-black text-yellow-400 uppercase tracking-widest border border-yellow-400/20 shadow">
                              {card.r}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {flippedBoosterIndices.length < 5 ? (
                <p className="text-xs font-bold text-slate-400 animate-pulse">Clique em cada carta acima para revelar a holografia!</p>
              ) : (
                <div className="max-w-md mx-auto space-y-3 pt-4">
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <p className="text-xs text-yellow-400 font-bold">
                      🎉 Parabéns pelas conquistas! Você adicionou essas cartas raras da liga à sua coleção virtual de batalha.
                    </p>
                  </div>
                  <button 
                    onClick={finishBoosterOpening}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                  >
                    Guardar no Fichário & Voltar
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      ) : !gameState ? (
        /* ======================== LOBBY & COPA SELECTION VIEW ======================== */
        <div className="space-y-6">
          {/* Deck Select option for Tournament */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">PREPARAÇÃO DE ACORDO COM AS REGRAS</span>
              <h4 className="text-sm font-black text-white">Configure o seu deck ativo antes de competir</h4>
            </div>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-64"
            >
              <option value="preset">🔥💧 Deck de Testes Inicial (60 cartas)</option>
              {availableDecks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  🃏 {deck.name} ({deck.cards.reduce((sum, c) => sum + c.quantity, 0)} cartas)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* CUPS LISTING PANEL */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">
                  Copas de Campeonato Disponíveis
                </h3>
                <span className="text-xs text-slate-500 font-bold">Inicie sua jornada rumo ao topo</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {CHAMPIONSHIP_CUPS.map((cup) => {
                  const isLocked = ladderState.elo < cup.eloReq;
                  const isSelected = ladderState.activeCupId === cup.id;
                  const isWon = ladderState.wonCups.includes(cup.id);

                  return (
                    <div 
                      key={cup.id}
                      className={`bg-slate-900 rounded-2xl border transition-all relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center p-5 gap-4 ${
                        isLocked 
                          ? 'border-slate-800/40 opacity-60' 
                          : isSelected
                            ? 'border-sky-500/60 shadow-lg shadow-sky-950/20'
                            : 'border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase text-white bg-gradient-to-r ${cup.tierColor} px-2 py-0.5 rounded`}>
                            {cup.tier}
                          </span>
                          {isWon && (
                            <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full font-black">
                              🏆 Campeão
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-black text-white flex items-center gap-1.5">
                          <span>{cup.badge}</span>
                          <span>{cup.name}</span>
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                          <span>Requisito ELO: <strong className="font-mono">{cup.eloReq}</strong></span>
                          <span>Custo de Entrada: <strong className="font-mono text-yellow-400">{cup.entryFee} moedas</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-end gap-2 justify-between border-t border-slate-800 md:border-0 pt-3 md:pt-0">
                        <div className="text-[11px] text-slate-400 text-left md:text-right">
                          <span className="block text-[9px] text-slate-500 font-bold uppercase">Recompensa ao vencer:</span>
                          <span className="font-black text-yellow-400 flex items-center gap-0.5 md:justify-end mt-0.5">
                            +{cup.rewards.coins} <Coins className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[9px] font-black text-sky-400">Pack {cup.rewards.pack}</span>
                        </div>

                        {isLocked ? (
                          <span className="flex items-center gap-1 text-[10px] bg-slate-950 text-slate-500 px-3 py-1.5 rounded-lg border border-slate-800 font-bold">
                            <Lock className="w-3.5 h-3.5" /> Bloqueado ({cup.eloReq} pts)
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800 px-3 py-1.5 rounded-lg font-black uppercase">
                            Selecionado
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (ladderState.coins < cup.entryFee) {
                                setErrorMessage('Moedas insuficientes para a taxa de inscrição!');
                                return;
                              }
                              setLadderState(prev => ({
                                ...prev,
                                coins: prev.coins - cup.entryFee,
                                activeCupId: cup.id,
                                cupRound: 'quarter'
                              }));
                              triggerAiDialogue(`Inscrição feita na ${cup.name}! Desafie as Quartas de Final agora.`);
                            }}
                            className="text-[10px] font-black uppercase bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-lg transition-all"
                          >
                            Inscrever-se
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BRACKET PROGRESS / ACTION SIDEBAR */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                  Seu Progresso na Copa
                </span>

                {currentCup ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] text-sky-400 uppercase font-black tracking-widest block">COPA ATIVA</span>
                      <span className="text-xs font-black text-white block mt-0.5">{currentCup.name}</span>
                    </div>

                    {/* Interactive Tree Steps */}
                    <div className="space-y-3">
                      {[
                        { key: 'quarter', name: 'Quartas de Final', desc: currentCup.opponents.quarter.name, icon: currentCup.opponents.quarter.icon },
                        { key: 'semi', name: 'Semifinal', desc: currentCup.opponents.semi.name, icon: currentCup.opponents.semi.icon },
                        { key: 'final', name: 'Grande Final', desc: currentCup.opponents.final.name, icon: currentCup.opponents.final.icon },
                      ].map((step, idx) => {
                        const isDone = 
                          (step.key === 'quarter' && ['semi', 'final', 'victory_claim'].includes(ladderState.cupRound)) ||
                          (step.key === 'semi' && ['final', 'victory_claim'].includes(ladderState.cupRound)) ||
                          (step.key === 'final' && ladderState.cupRound === 'victory_claim');

                        const isCurrent = ladderState.cupRound === step.key;

                        return (
                          <div 
                            key={step.key}
                            className={`p-3 rounded-xl border flex items-center justify-between ${
                              isDone
                                ? 'bg-emerald-950/20 border-emerald-500/20'
                                : isCurrent
                                  ? 'bg-sky-950/20 border-sky-500/30'
                                  : 'bg-slate-950/20 border-slate-850/40 text-slate-500'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-500 block uppercase">{step.name}</span>
                              <span className="text-xs font-black text-slate-200 block">{step.desc}</span>
                            </div>
                            <span className="text-lg">
                              {isDone ? '✅' : isCurrent ? '🔥' : '🔒'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {ladderState.cupRound === 'victory_claim' ? (
                      <div className="space-y-3 pt-2">
                        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-center">
                          <span className="text-[10px] font-black text-emerald-400 block animate-pulse">CAMPEÃO CONSAGRADO!</span>
                        </div>
                        <button
                          onClick={() => {
                            setLadderState(prev => ({
                              ...prev,
                              activeCupId: null,
                              cupRound: 'lobby'
                            }));
                          }}
                          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold font-black"
                        >
                          Voltar ao Lobby de Copas
                        </button>
                      </div>
                    ) : nextOpponent ? (
                      <div className="bg-slate-950/80 p-4 border border-slate-850 rounded-xl space-y-4">
                        <div className="text-center space-y-1">
                          <span className="text-[9px] font-black text-red-500 tracking-wider block">PRÓXIMO ADVERSÁRIO</span>
                          <div className="text-3xl mt-2">{nextOpponent.avatar}</div>
                          <span className="text-xs font-black text-white block mt-1">{nextOpponent.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">ELO: {nextOpponent.elo} | {nextOpponent.deckName}</span>
                        </div>

                        <button
                          onClick={handleStartPlaytest}
                          className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                        >
                          <Sword className="w-4 h-4" /> Entrar no Ringue de Batalha
                        </button>
                      </div>
                    ) : null}

                    <button
                      onClick={() => {
                        setLadderState(prev => ({
                          ...prev,
                          activeCupId: null,
                          cupRound: 'lobby'
                        }));
                      }}
                      className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-slate-500 hover:text-slate-300 rounded-xl text-[10px] font-bold transition-all uppercase"
                    >
                      Desistir desta Copa
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Nenhuma Copa ativa no momento. Escolha uma das ligas acima e clique em <strong>Inscrever-se</strong> para começar!
                    </p>
                    <div className="text-3xl text-slate-600 animate-bounce">⚔️</div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ======================== LUXURY THEMED CYBERPUNK BATTLEMAT ======================== */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* PLAYMAT FIELD */}
          <div className="xl:col-span-9 space-y-6">
            
            <AnimatePresence>
              {selectedHandCard && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-cyan-500 text-slate-950 px-4 py-2.5 rounded-xl flex justify-between items-center text-xs font-bold shadow-lg animate-pulse"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-slate-900" />
                    <span>
                      Alvo Ativo: <strong>{selectedHandCard.card.name}</strong>. 
                      {selectedHandCard.card.category === 'Pokemon' && ' Clique em um Pokémon base válido no campo (Ativo ou Banco) para evoluir.'}
                      {selectedHandCard.card.category === 'Energy' && ' Clique em um Pokémon do campo para ligar esta energia.'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedHandCard(null)}
                    className="bg-slate-950/20 hover:bg-slate-950/40 px-2 py-1 rounded text-[10px] font-black uppercase text-slate-900"
                  >
                    Cancelar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CYBERPUNK BATTLEFIELD STADIUM MAT */}
            <div 
              className="relative rounded-3xl border-[8px] border-slate-900 shadow-2xl p-4 md:p-6 overflow-hidden flex flex-col justify-between"
              style={{
                minHeight: '600px',
                backgroundColor: '#0a0d1a',
                backgroundImage: `
                  radial-gradient(circle at center, rgba(30, 24, 74, 0.5) 0%, rgba(6, 7, 16, 0.99) 100%),
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")
                `
              }}
            >
              {/* Laser Grid Overlay */}
              <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
              <div className="absolute inset-4 border border-indigo-500/10 rounded-2xl pointer-events-none" />
              <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-sky-500/20 -translate-y-1/2 pointer-events-none" />

              {/* OPPONENT AREA (P2) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                  <div className="flex items-center gap-2 text-xs text-slate-200 font-bold">
                    <span className="text-lg">🤖</span>
                    <span className="font-black text-sky-400">{gameState.players.P2.name}</span>
                  </div>
                  
                  {/* EMOTE BUBBLE DIALOGUE */}
                  {showAiDialogue && (
                    <div className="bg-slate-950 text-sky-400 border border-sky-800/40 text-[9px] font-bold px-3 py-1 rounded-full animate-fade-in truncate max-w-xs shrink-0">
                      💬 {aiDialogue}
                    </div>
                  )}

                  <div className="flex gap-4 text-[10px] font-bold text-slate-400 font-mono">
                    <span>Prêmios: {gameState.players.P2.prizes.length}</span>
                    <span>Mão: {gameState.players.P2.hand.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 items-center justify-items-center">
                  {/* Opponent Bench */}
                  <div className="col-span-4 flex justify-center gap-3 w-full">
                    {gameState.players.P2.bench.map((benchPoke) => {
                      const topCard = benchPoke.evolutionStack[benchPoke.evolutionStack.length - 1].card;
                      return (
                        <div key={benchPoke.instanceId} className="relative w-16 h-22 opacity-85 rounded-lg overflow-hidden border border-slate-800 shadow-md">
                          <CardImage
                            card={topCard}
                            src={topCard.image ? formatCardImageUrl(topCard.image) : undefined}
                            alt={topCard.name}
                            className="w-full h-full"
                          />
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-red-500/30 px-1.5 py-0.5 rounded text-[8px] font-black text-red-400 font-mono pointer-events-none whitespace-nowrap shadow-md z-20">
                            {topCard.hp ? topCard.hp - benchPoke.damage : 0} HP
                          </div>
                        </div>
                      );
                    })}
                    {Array.from({ length: 5 - gameState.players.P2.bench.length }).map((_, i) => (
                      <div key={i} className="w-16 h-22 border border-dashed border-slate-850/40 rounded-xl flex items-center justify-center text-[8px] text-slate-700 font-bold">
                        Vazio
                      </div>
                    ))}
                  </div>

                  {/* Opponent Active */}
                  <div className="col-span-2">
                    {gameState.players.P2.active ? (
                      (() => {
                        const topCard = gameState.players.P2.active.evolutionStack[gameState.players.P2.active.evolutionStack.length - 1].card;
                        return (
                          <div className="relative w-24 h-32 rounded-xl overflow-hidden shadow-xl border border-slate-800">
                            <CardImage
                              card={topCard}
                              src={topCard.image ? formatCardImageUrl(topCard.image) : undefined}
                              alt={topCard.name}
                              className="w-full h-full"
                            />
                            <span className="absolute top-1 right-1 text-[8px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded shadow z-20">ATIVO</span>
                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-red-500/30 px-2 py-0.5 rounded text-[9px] font-bold text-red-400 font-mono pointer-events-none whitespace-nowrap shadow-lg z-20">
                              HP: {topCard.hp ? topCard.hp - gameState.players.P2.active.damage : 0}/{topCard.hp}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="w-20 h-28 border-2 border-dashed border-red-500/20 rounded-2xl flex items-center justify-center text-xs text-red-500/50 font-bold">
                        Nenhum
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COPA TCG LIVE CENTER STADIUM MATRIX */}
              <div className="my-3 flex justify-center relative">
                <div className="bg-slate-950/90 border border-indigo-500/30 rounded-full px-5 py-1 text-[9px] text-cyan-400 font-black tracking-widest z-10 shadow-lg shadow-indigo-950/50">
                  COPA TCG LIVE • ARENA MATRIX
                </div>
              </div>

              {/* PLAYER AREA (P1) */}
              <div className="space-y-4 relative z-20">
                <div className="grid grid-cols-12 gap-4 items-end">
                  
                  {/* Player Prizes */}
                  <div className="col-span-2 space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 tracking-wider block">PRÊMIOS ({gameState.players.P1.prizes.length})</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {gameState.players.P1.prizes.map((p, idx) => (
                        <div 
                          key={p.instanceId}
                          className="aspect-[3/4] rounded bg-gradient-to-br from-indigo-700 via-purple-800 to-indigo-950 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black cursor-not-allowed shadow-md hover:brightness-110 transition-all"
                        >
                          <span className="text-white text-[9px] font-black drop-shadow">P</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active and Bench Slots */}
                  <div className="col-span-8 grid grid-cols-6 gap-3 items-end">
                    
                    {/* Active Pokémon with sliced stacked energies under it */}
                    <div className="col-span-2">
                      <span className="text-[8px] font-black text-sky-400 block text-center uppercase tracking-wider mb-1">Pokémon Ativo</span>
                      {gameState.players.P1.active ? (
                        (() => {
                          const activePoke = gameState.players.P1.active;
                          const topCard = activePoke.evolutionStack[activePoke.evolutionStack.length - 1].card;
                          const isComp = isCompatibleWithActive(selectedHandCard, activePoke);
                          return (
                            <div 
                              onClick={() => handleTargetPokemon(activePoke.instanceId)}
                              className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all cursor-pointer w-full min-h-[160px] max-w-[130px] mx-auto group ${
                                isComp 
                                  ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-slate-950 scale-102' 
                                  : 'hover:scale-[1.01] border border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <CardImage
                                card={topCard}
                                src={topCard.image ? formatCardImageUrl(topCard.image) : undefined}
                                alt={topCard.name}
                                className="w-full h-full"
                              />
                              
                              {/* Dynamic Overlays */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent p-2 pt-6 flex flex-col justify-end pointer-events-none z-20">
                                <div className="flex justify-between items-center gap-1">
                                  <span className="text-[9px] font-black text-slate-200 bg-slate-950/45 px-1 py-0.5 rounded truncate flex-1">{topCard.name}</span>
                                  <span className="text-[9px] font-black text-red-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-red-500/20 shrink-0">
                                    {topCard.hp ? topCard.hp - activePoke.damage : 0} HP
                                  </span>
                                </div>
                                
                                {/* Stacked Energies Visualizer */}
                                {activePoke.attachedEnergy.length > 0 && (
                                  <div className="flex gap-1 flex-wrap mt-1">
                                    {activePoke.attachedEnergy.map((ae) => (
                                      <span key={ae.cardInstanceId} className="text-[8px] bg-sky-950 border border-sky-800 text-sky-300 px-1 rounded font-bold leading-none py-0.5">
                                        {ae.providedEnergy[0]?.type === 'Fire' ? '🔥' : '💧'}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {activePoke.specialConditions.length > 0 && (
                                  <div className="text-[8px] bg-red-600/90 text-white px-1 py-0.5 rounded font-black text-center mt-1 uppercase tracking-wider animate-pulse">
                                    {activePoke.specialConditions.join(', ')}
                                  </div>
                                )}
                              </div>
                              
                              {/* Evolution Count Badge */}
                              {activePoke.evolutionStack.length > 1 && (
                                <span className="absolute top-1.5 left-1.5 text-[8px] bg-sky-600 text-white font-black px-1.5 py-0.5 rounded shadow z-20">
                                  EVO x{activePoke.evolutionStack.length}
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div 
                          onClick={() => {
                            if (selectedHandCard && selectedHandCard.card.category === 'Pokemon') {
                              dispatchAction({
                                type: 'PLAY_BASIC',
                                player: 'P1',
                                cardId: selectedHandCard.instanceId,
                              });
                            }
                          }}
                          className="w-full min-h-[160px] max-w-[130px] mx-auto border-2 border-dashed border-sky-500/20 rounded-2xl flex flex-col items-center justify-center text-sky-500/50 hover:border-sky-500/40 cursor-pointer p-3 text-center transition-all bg-sky-950/10"
                        >
                          <HelpCircle className="w-5 h-5 mb-1 text-sky-500" />
                          <span className="text-[9px] font-bold">Invoque uma básica aqui</span>
                        </div>
                      )}
                    </div>

                    {/* Benched Slots */}
                    <div className="col-span-4 grid grid-cols-5 gap-2">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const benchPoke = gameState.players.P1.bench[idx];
                        if (benchPoke) {
                          const topCard = benchPoke.evolutionStack[benchPoke.evolutionStack.length - 1].card;
                          const isComp = isCompatibleWithBench(selectedHandCard, benchPoke);
                          return (
                            <div 
                              key={benchPoke.instanceId}
                              onClick={() => handleTargetPokemon(benchPoke.instanceId)}
                              className={`relative rounded-xl overflow-hidden h-24 transition-all cursor-pointer shadow-md w-full group ${
                                isComp 
                                  ? 'ring-4 ring-emerald-500 ring-offset-1 ring-offset-slate-950 scale-102' 
                                  : 'hover:scale-[1.01] border border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <CardImage
                                card={topCard}
                                src={topCard.image ? formatCardImageUrl(topCard.image) : undefined}
                                alt={topCard.name}
                                className="w-full h-full"
                              />
                              
                              {/* Overlays */}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 to-transparent p-1 pt-3 flex flex-col justify-end pointer-events-none z-20">
                                <div className="flex justify-between items-center gap-0.5">
                                  <span className="truncate text-[7px] font-bold text-slate-200 max-w-[32px]">{topCard.name}</span>
                                  <span className="text-[7px] text-red-400 font-bold font-mono bg-slate-950/80 px-0.5 rounded leading-none">
                                    {topCard.hp ? topCard.hp - benchPoke.damage : 0}
                                  </span>
                                </div>

                                {benchPoke.attachedEnergy.length > 0 && (
                                  <div className="flex gap-0.5 mt-0.5 overflow-x-auto scrollbar-none">
                                    {benchPoke.attachedEnergy.map((ae) => (
                                      <span key={ae.cardInstanceId} className="text-[7px] leading-none shrink-0">
                                        {ae.providedEnergy[0]?.type === 'Fire' ? '🔥' : '💧'}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Empty bench slot to summon basic
                        return (
                          <div 
                            key={idx}
                            onClick={() => {
                              if (selectedHandCard && selectedHandCard.card.category === 'Pokemon') {
                                dispatchAction({
                                  type: 'PLAY_BASIC',
                                  player: 'P1',
                                  cardId: selectedHandCard.instanceId,
                                  targetBenchIndex: idx,
                                });
                              }
                            }}
                            className="h-24 border border-dashed border-slate-800/40 hover:border-slate-750 hover:bg-slate-900/10 rounded-xl flex items-center justify-center text-[8px] text-slate-600 font-bold cursor-pointer text-center transition-all"
                          >
                            Vazio
                          </div>
                        );
                      })}
                    </div>

                  </div>

                  {/* Player Deck & Discard */}
                  <div className="col-span-2 flex flex-col gap-2">
                    <div 
                      onClick={() => {
                        if (gameState.players.P1.deck.length > 0) {
                          setIsSearchingDeck(true);
                        }
                      }}
                      className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-center cursor-pointer hover:bg-slate-850 transition-all"
                    >
                      <BookOpen className="w-4 h-4 mx-auto text-sky-400 mb-1" />
                      <span className="text-[8px] font-black text-slate-300 block">EXAMINAR DECK</span>
                      <span className="text-[10px] text-sky-400 font-mono font-bold">{gameState.players.P1.deck.length} restando</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-center">
                      <span className="text-[8px] font-black text-slate-400 block uppercase mb-1">Descarte</span>
                      <span className="text-[12px] text-slate-300 font-mono font-black">{gameState.players.P1.discard.length} cartas</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* PLAYER HAND & TURN CONTROLS */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-4 shadow-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  ✋ Sua Mão ({gameState.players.P1.hand.length} cartas)
                </span>
                
                {gameState.activePlayer === 'P1' ? (
                  <div className="flex gap-2">
                    {gameState.phase === 'TURN_START' && (
                      <button
                        onClick={() => dispatchAction({ type: 'DRAW_CARD', player: 'P1' })}
                        className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-black transition-all shadow shadow-sky-600/10"
                      >
                        Comprar Carta Turno
                      </button>
                    )}

                    <button
                      onClick={() => dispatchAction({ type: 'END_TURN', player: 'P1' })}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black transition-all border border-slate-700"
                    >
                      Passar Turno
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-red-500 font-black animate-pulse flex items-center gap-1">
                    ⏳ Turno do Oponente...
                  </span>
                )}
              </div>

              {/* Hand cards list */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {gameState.players.P1.hand.map((instance) => {
                  const isSelected = selectedHandCard?.instanceId === instance.instanceId;
                  const isTrainer = instance.card.category === 'Trainer';
                  const isEnergy = instance.card.category === 'Energy';

                  return (
                    <div
                      key={instance.instanceId}
                      onClick={() => handleSelectHandCard(instance)}
                      className={`flex-shrink-0 w-28 h-40 relative rounded-xl overflow-hidden transition-all cursor-pointer shadow-lg ${
                        isSelected 
                          ? 'ring-4 ring-sky-400 ring-offset-2 ring-offset-slate-950 scale-105 z-30' 
                          : 'hover:scale-[1.02]'
                      }`}
                    >
                      <CardImage
                        card={instance.card}
                        src={instance.card.image ? formatCardImageUrl(instance.card.image) : undefined}
                        alt={instance.card.name}
                        className="w-full h-full"
                      />
                      
                      {isSelected && (
                        <div className="absolute inset-0 bg-slate-950/90 flex flex-col justify-center items-center p-2 gap-1.5 z-40">
                          <span className="text-[9px] font-black text-slate-200 text-center truncate w-full mb-1">{instance.card.name}</span>
                          {isTrainer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatchAction({
                                  type: 'PLAY_TRAINER',
                                  player: 'P1',
                                  cardId: instance.instanceId,
                                });
                              }}
                              className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-[8px] font-black text-white uppercase tracking-wider shadow"
                            >
                              Jogar Treinador
                            </button>
                          )}
                          {!isTrainer && !isEnergy && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatchAction({
                                  type: 'PLAY_BASIC',
                                  player: 'P1',
                                  cardId: instance.instanceId,
                                });
                              }}
                              className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-[8px] font-black text-white uppercase tracking-wider shadow"
                            >
                              Invocação Direta
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHandCard(null);
                            }}
                            className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-[8px] font-black text-slate-400 uppercase tracking-wider"
                          >
                            Voltar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ACTIVE ATTACKS PANEL */}
              {gameState.players.P1.active && (
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block">
                      Habilidade & Ataques do Ativo
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      Ataques requerem as cartas de energias ligadas na mesa
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(gameState.players.P1.active.evolutionStack[gameState.players.P1.active.evolutionStack.length - 1].card.attacks || []).map((atk) => {
                      const costMet = RuleEngine.canPayAttackCost(gameState.players.P1.active!, atk.cost || []);
                      return (
                        <div 
                          key={atk.name} 
                          className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex justify-between items-center"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-100">{atk.name}</span>
                              <div className="flex gap-0.5">
                                {(atk.cost || []).map((c, i) => (
                                  <span key={i} className="text-[8px] bg-slate-800 text-slate-300 px-1 rounded font-mono font-bold">
                                    {c === 'Fire' ? '🔥' : c === 'Water' ? '💧' : '⭐'}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{atk.effect || 'Causa dano direto ao oponente ativo.'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-red-400">-{atk.damage} HP</span>
                            <button
                              onClick={() => dispatchAction({
                                type: 'ATTACK',
                                player: 'P1',
                                attackId: atk.name,
                              })}
                              disabled={!costMet || gameState.activePlayer !== 'P1'}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                costMet && gameState.activePlayer === 'P1'
                                  ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow shadow-red-600/10' 
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              Atacar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* SIDEBAR BATTLE LOGS & LADDER GAME OVER MODAL */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Holographic Toolset */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider block">Mesa de Transmissão</span>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCoinFlip}
                  disabled={isFlippingCoin}
                  className="p-3 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-850 text-center transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span className="text-xl block mb-1">🪙</span>
                  <span className="text-[9px] font-black text-slate-400 block">LANÇAR MOEDA</span>
                  {coinResult && (
                    <span className="text-xs font-black text-yellow-400 block mt-1 animate-bounce">{coinResult}</span>
                  )}
                </button>

                <button
                  onClick={handleDiceRoll}
                  disabled={isRollingDice}
                  className="p-3 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-850 text-center transition-all active:scale-95 flex flex-col items-center justify-center"
                >
                  <span className="text-xl block mb-1">🎲</span>
                  <span className="text-[9px] font-black text-slate-400 block">ROLAR DADO</span>
                  {diceResult && (
                    <span className="text-xs font-black text-purple-400 block mt-1 animate-bounce">FACES [{diceResult}]</span>
                  )}
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setGameState(null)}
                  className="w-full py-2 bg-slate-950 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-xl text-[10px] font-black transition-all uppercase tracking-wide border border-red-950"
                >
                  🏳️ Desistir da Partida
                </button>
              </div>
            </div>

            {/* Console Log Tracker */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col h-[320px]">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider block mb-2">Logs da Copa Live</span>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-[10px] font-mono leading-relaxed text-slate-400">
                {gameState.history.map((event, idx) => {
                  if (event.type === 'LOG_MESSAGE') {
                    return (
                      <div key={idx} className="border-b border-slate-850 pb-1.5 last:border-0">
                        {event.message}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

          </div>

          {/* GAME OVER LADDER RESULTS OVERLAY MODAL */}
          <AnimatePresence>
            {gameState.winner && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.95 }}
                  className="bg-slate-900 border border-slate-850 rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6 shadow-2xl"
                >
                  <div className="space-y-2">
                    <div className="text-5xl">
                      {gameState.winner === 'P1' ? '🏆' : '💀'}
                    </div>
                    <h3 className="text-xl font-black text-white">
                      {gameState.winner === 'P1' ? 'Vitória Consagrada!' : 'Fim de Jogo!'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {gameState.winner === 'P1' 
                        ? 'Você jogou como um verdadeiro mestre! Seus prêmios e rankings foram atualizados.' 
                        : 'Seu oponente levou a melhor desta vez. Ajuste sua estratégia e monte novos planos.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-2 text-left">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Classificação:</span>
                      <span className="font-black text-white">{gameState.winner === 'P1' ? 'Avançou Rodada' : 'Derrotado'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Variação ELO:</span>
                      <span className={`font-black ${gameState.winner === 'P1' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {gameState.winner === 'P1' ? '+30 pts' : '-15 pts'}
                      </span>
                    </div>
                    {gameState.winner === 'P1' && (
                      <div className="flex justify-between text-xs border-t border-slate-900 pt-2 mt-2">
                        <span className="text-slate-400">Moedas ganhas:</span>
                        <span className="font-black text-yellow-400 font-mono">+50</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setGameState(null)}
                    className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Voltar para o Quadro da Copa
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* DECK SEARCH DIALOG MODAL */}
      <AnimatePresence>
        {isSearchingDeck && gameState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl"
            >
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/55">
                <div>
                  <h3 className="text-sm font-black text-white">Examinador de Deck TCG</h3>
                  <p className="text-[10px] text-slate-400">Consulte o conteúdo interno ordenado para estratégias.</p>
                </div>
                <button
                  onClick={() => setIsSearchingDeck(false)}
                  className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300"
                >
                  Fechar
                </button>
              </div>

              {/* Filtering Controls */}
              <div className="p-3 border-b border-slate-850 bg-slate-950/20 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por nome..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="flex gap-1.5">
                  {['all', 'Pokemon', 'Trainer', 'Energy'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSearchFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                        searchFilterCategory === cat ? 'bg-sky-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-850'
                      }`}
                    >
                      {cat === 'all' ? 'Tudo' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid content */}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/30">
                {gameState.players[gameState.activePlayer].deck
                  .filter((instance) => {
                    const matchesSearch = instance.card.name.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesCategory = searchFilterCategory === 'all' || instance.card.category === searchFilterCategory;
                    return matchesSearch && matchesCategory;
                  })
                  .map((instance) => (
                    <div 
                      key={instance.instanceId}
                      onClick={() => handleSelectCardFromDeckSearch(instance.instanceId)}
                      className="relative rounded-xl overflow-hidden h-36 cursor-pointer transition-all hover:scale-105 group shadow-md"
                    >
                      <CardImage
                        card={instance.card}
                        src={instance.card.image ? formatCardImageUrl(instance.card.image) : undefined}
                        alt={instance.card.name}
                        className="w-full h-full"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/20 to-transparent p-2 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <span className="text-[9px] font-black text-white truncate block">{instance.card.name}</span>
                        <button className="mt-1 w-full py-1 text-[8px] font-black uppercase text-sky-400 bg-sky-950/90 border border-sky-800 rounded shadow">
                          Pegar para Mão
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
