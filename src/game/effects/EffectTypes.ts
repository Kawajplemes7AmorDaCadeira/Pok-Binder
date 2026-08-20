/**
 * EffectTypes.ts - Discriminated unions and definitions for declarative effects.
 */

import { PlayerId } from '../engine/GamePhase';

export type EffectType =
  | 'DRAW'
  | 'DAMAGE'
  | 'PLACE_DAMAGE_COUNTERS'
  | 'HEAL'
  | 'SEARCH_DECK'
  | 'DISCARD'
  | 'SWITCH'
  | 'ATTACH_ENERGY'
  | 'MOVE_ENERGY'
  | 'REMOVE_ENERGY'
  | 'SHUFFLE'
  | 'COIN_FLIP'
  | 'APPLY_SPECIAL_CONDITION';

export type EffectTargetType =
  | 'SOURCE_POKEMON'
  | 'OWN_ACTIVE'
  | 'OPPONENT_ACTIVE'
  | 'OWN_BENCH'
  | 'OPPONENT_BENCH'
  | 'SELECTED_POKEMON'
  | 'SELF_PLAYER'
  | 'OPPONENT_PLAYER';

export interface EffectTarget {
  type: EffectTargetType;
}

export type EffectConditionType =
  | 'HAS_DAMAGE'
  | 'HAS_ENERGY'
  | 'TARGET_HAS_DAMAGE'
  | 'COIN_RESULT'
  | 'PRIZE_COUNT'
  | 'POKEMON_TYPE'
  | 'ENERGY_TYPE'
  | 'BENCH_COUNT'
  | 'HAND_SIZE_AT_MOST';

export interface EffectCondition {
  type: EffectConditionType;
  amount?: number;
  expectedCoinResult?: 'HEADS' | 'TAILS';
}

export type EffectDurationType =
  | 'INSTANT'
  | 'THIS_TURN'
  | 'UNTIL_END_OF_TURN'
  | 'UNTIL_END_OF_OPPONENT_TURN'
  | 'WHILE_SOURCE_IN_PLAY'
  | 'WHILE_ATTACHED'
  | 'WHILE_STADIUM_ACTIVE';

export interface EffectDuration {
  type: EffectDurationType;
}

export interface BaseEffectDefinition {
  id: string;
  type: EffectType;
  target?: EffectTarget;
  condition?: EffectCondition;
  duration?: EffectDuration;
  optional?: boolean;
}

export interface DrawEffectDefinition extends BaseEffectDefinition {
  type: 'DRAW';
  amount: number;
}

export interface DamageEffectDefinition extends BaseEffectDefinition {
  type: 'DAMAGE';
  amount: number;
}

export interface PlaceDamageCountersEffectDefinition extends BaseEffectDefinition {
  type: 'PLACE_DAMAGE_COUNTERS';
  counters: number; // 1 counter = 10 damage
}

export interface HealEffectDefinition extends BaseEffectDefinition {
  type: 'HEAL';
  amount: number;
}

export interface SearchDeckEffectDefinition extends BaseEffectDefinition {
  type: 'SEARCH_DECK';
  amount: number;
  filter: {
    supertype?: string;
    subtype?: string;
    stage?: string;
    pokemonType?: string;
    energyType?: string;
    cardName?: string;
  };
  destination: 'HAND' | 'BENCH' | 'ACTIVE';
  reveal?: boolean;
  shuffleAfter?: boolean;
}

export interface DiscardEffectDefinition extends BaseEffectDefinition {
  type: 'DISCARD';
  sourceZone: 'HAND' | 'ACTIVE' | 'BENCH' | 'ATTACHED_ENERGY';
  amount: number;
}

export interface SwitchEffectDefinition extends BaseEffectDefinition {
  type: 'SWITCH';
  targetSlot: 'ACTIVE' | number;
}

export interface AttachEnergyEffectDefinition extends BaseEffectDefinition {
  type: 'ATTACH_ENERGY';
  energyType?: string;
  count: number;
}

export interface MoveEnergyEffectDefinition extends BaseEffectDefinition {
  type: 'MOVE_ENERGY';
  count: number;
}

export interface RemoveEnergyEffectDefinition extends BaseEffectDefinition {
  type: 'REMOVE_ENERGY';
  count: number;
}

export interface ShuffleEffectDefinition extends BaseEffectDefinition {
  type: 'SHUFFLE';
  targetZone: 'DECK' | 'HAND';
}

export interface CoinFlipEffectDefinition extends BaseEffectDefinition {
  type: 'COIN_FLIP';
  count: number;
  successEffects?: EffectDefinition[];
  failureEffects?: EffectDefinition[];
}

export interface ApplySpecialConditionEffectDefinition extends BaseEffectDefinition {
  type: 'APPLY_SPECIAL_CONDITION';
  conditionType: 'POISONED' | 'BURNED' | 'ASLEEP' | 'PARALYZED' | 'CONFUSED';
}

export type EffectDefinition =
  | DrawEffectDefinition
  | DamageEffectDefinition
  | PlaceDamageCountersEffectDefinition
  | HealEffectDefinition
  | SearchDeckEffectDefinition
  | DiscardEffectDefinition
  | SwitchEffectDefinition
  | AttachEnergyEffectDefinition
  | MoveEnergyEffectDefinition
  | RemoveEnergyEffectDefinition
  | ShuffleEffectDefinition
  | CoinFlipEffectDefinition
  | ApplySpecialConditionEffectDefinition;
