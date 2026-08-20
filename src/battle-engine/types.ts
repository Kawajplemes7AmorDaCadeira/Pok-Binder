import { PokemonCard } from '../types';

export type PlayerId = 'P1' | 'P2';

export type GamePhase =
  | 'SETUP'
  | 'TURN_START'
  | 'MAIN'
  | 'ATTACK'
  | 'POKEMON_CHECKUP'
  | 'PROMOTION'
  | 'GAME_OVER';

export type Zone =
  | 'DECK'
  | 'HAND'
  | 'ACTIVE'
  | 'BENCH'
  | 'DISCARD'
  | 'PRIZES'
  | 'LOST_ZONE';

export type SpecialCondition =
  | 'ASLEEP'
  | 'BURNED'
  | 'CONFUSED'
  | 'PARALYZED'
  | 'POISONED';

export type WinReason =
  | 'PRIZES_TAKEN'
  | 'NO_POKEMON_IN_PLAY'
  | 'DECK_OUT';

export interface CardInstance {
  instanceId: string;
  card: PokemonCard;
  ownerId: PlayerId;
}

export interface AttachedEnergy {
  cardInstanceId: string;
  providedEnergy: { type: string; amount: number }[];
}

export interface PokemonInPlay {
  instanceId: string;
  evolutionStack: CardInstance[]; // [BaseCard, Stage1, Stage2] with top card being current
  damage: number;
  attachedCards: CardInstance[]; // e.g. Tools
  attachedEnergy: AttachedEnergy[];
  specialConditions: SpecialCondition[];
  temporaryEffects: RuntimeEffect[];
  enteredPlayTurn: number;
  lastEvolutionTurn?: number;
  abilityUsage: Record<string, number>; // abilityId -> usageCountThisTurn
}

export interface RuntimeEffect {
  id: string;
  type: string;
  sourceCardId: string;
  value: any;
  duration: EffectDuration;
  expiryTurn?: number;
}

export type EffectDuration =
  | 'INSTANT'
  | 'UNTIL_END_OF_TURN'
  | 'UNTIL_END_OF_NEXT_TURN'
  | 'WHILE_IN_PLAY'
  | 'WHILE_ACTIVE'
  | 'UNTIL_LEAVES_ACTIVE'
  | 'PERMANENT';

export interface PendingEffect {
  sourceCardId: string;
  sourcePokemonId?: string;
  controller: PlayerId;
  effect: CardEffect;
  priority: number;
}

export interface PendingChoice {
  player: PlayerId;
  type: 'SELECT_POKEMON' | 'SELECT_CARDS' | 'COIN_FLIP' | 'CHOOSE_ATTACK' | 'SELECT_ZONE_TARGET';
  min: number;
  max: number;
  filters: {
    owner?: 'SELF' | 'OPPONENT' | 'ANY';
    zones?: Zone[];
    categories?: string[];
    isBasic?: boolean;
    cardName?: string;
  };
  resolve: (choice: any) => void;
}

export type CardEffect =
  | { type: 'DRAW'; amount: number }
  | { type: 'DAMAGE'; amount: number; target: 'ACTIVE' | 'BENCH' | 'OPPONENT_ACTIVE' | 'OPPONENT_BENCH' | 'ANY' }
  | { type: 'PLACE_DAMAGE_COUNTERS'; counters: number; target: 'ACTIVE' | 'BENCH' | 'OPPONENT_ACTIVE' | 'OPPONENT_BENCH' | 'ANY' }
  | { type: 'HEAL'; amount: number; target: 'ACTIVE' | 'BENCH' | 'ANY' }
  | { type: 'SEARCH'; amount: number; filterCategory?: string; isBasic?: boolean; targetZone: Zone }
  | { type: 'DISCARD'; amount: number; target: 'HAND' | 'ACTIVE_ENERGY' }
  | { type: 'ATTACH_ENERGY'; cardId: string; targetId: string }
  | { type: 'MOVE_ENERGY'; sourceId: string; targetId: string; amount: number }
  | { type: 'SWITCH'; targetId?: string }
  | { type: 'APPLY_CONDITION'; condition: SpecialCondition; target: 'OPPONENT_ACTIVE' | 'ACTIVE' }
  | { type: 'COIN_FLIP'; onSuccess: CardEffect[]; onFailure?: CardEffect[] }
  | { type: 'MODIFY_DAMAGE'; amount: number; condition?: string }
  | { type: 'PREVENT_DAMAGE'; duration: EffectDuration }
  | { type: 'TAKE_PRIZE'; amount: number }
  | { type: 'CUSTOM'; handlerId: string };

export interface RNGState {
  seed: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  prizes: CardInstance[];
  active: PokemonInPlay | null;
  bench: PokemonInPlay[];
  supporterPlayedThisTurn: boolean;
  stadiumPlayedThisTurn: boolean;
  energyAttachedThisTurn: boolean;
  retreatedThisTurn: boolean;
  mulligans: number;
}

export interface GameState {
  id: string;
  players: Record<PlayerId, PlayerState>;
  activePlayer: PlayerId;
  firstPlayer: PlayerId;
  turnNumber: number;
  phase: GamePhase;
  pendingEffects: PendingEffect[];
  continuousEffects: any[]; // continuous buffs, rules
  pendingChoice?: PendingChoice;
  winner?: PlayerId;
  winReason?: WinReason;
  history: GameEvent[];
  rng: RNGState;
}

export type GameAction =
  | { type: 'DRAW_CARD'; player: PlayerId }
  | { type: 'PLAY_BASIC'; player: PlayerId; cardId: string; targetBenchIndex?: number }
  | { type: 'EVOLVE'; player: PlayerId; cardId: string; targetId: string }
  | { type: 'ATTACH_ENERGY'; player: PlayerId; cardId: string; targetId: string }
  | { type: 'PLAY_TRAINER'; player: PlayerId; cardId: string }
  | { type: 'USE_ABILITY'; player: PlayerId; pokemonId: string; abilityId: string }
  | { type: 'RETREAT'; player: PlayerId; pokemonId: string }
  | { type: 'ATTACK'; player: PlayerId; attackId: string }
  | { type: 'MAKE_CHOICE'; player: PlayerId; choice: any }
  | { type: 'END_TURN'; player: PlayerId };

export type GameEvent =
  | { type: 'CARD_DRAWN'; player: PlayerId; cardName: string }
  | { type: 'CARD_PLAYED'; player: PlayerId; cardName: string }
  | { type: 'POKEMON_BENCHED'; player: PlayerId; pokemonName: string }
  | { type: 'POKEMON_EVOLVED'; player: PlayerId; fromName: string; toName: string }
  | { type: 'ENERGY_ATTACHED'; player: PlayerId; energyName: string; targetName: string }
  | { type: 'ABILITY_USED'; player: PlayerId; pokemonName: string; abilityName: string }
  | { type: 'ATTACK_DECLARED'; player: PlayerId; pokemonName: string; attackName: string }
  | { type: 'DAMAGE_DEALT'; source: string; target: string; amount: number; cause: string }
  | { type: 'DAMAGE_COUNTERS_PLACED'; target: string; count: number }
  | { type: 'POKEMON_KNOCKED_OUT'; player: PlayerId; pokemonName: string }
  | { type: 'PRIZE_TAKEN'; player: PlayerId; cardName: string }
  | { type: 'POKEMON_PROMOTED'; player: PlayerId; pokemonName: string }
  | { type: 'TURN_ENDED'; player: PlayerId }
  | { type: 'LOG_MESSAGE'; message: string };

export interface ActionResult {
  success: boolean;
  state: GameState;
  events: GameEvent[];
  error?: string;
}
