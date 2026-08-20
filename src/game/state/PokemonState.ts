/**
 * PokemonState.ts - Representation of Pokémon in play (active or bench).
 */

import { PlayerId, SpecialCondition } from '../engine/GamePhase';
import { CardInstance } from './CardState';

export interface AttachedEnergy {
  cardInstanceId: string;
  providedEnergy: { type: string; amount: number }[];
}

export interface RuntimeEffect {
  id: string;
  type: string;
  sourceCardId: string;
  value: any;
  duration: 'INSTANT' | 'UNTIL_END_OF_TURN' | 'UNTIL_END_OF_NEXT_TURN' | 'WHILE_IN_PLAY' | 'WHILE_ACTIVE' | 'PERMANENT';
}

export interface PokemonInPlay {
  instanceId: string;
  ownerId: PlayerId;
  evolutionStack: CardInstance[]; // BaseCard at index 0, evolutions stacked on top
  damage: number;
  attachedCards: CardInstance[]; // Tools, etc.
  attachedEnergy: AttachedEnergy[];
  specialConditions: SpecialCondition[];
  activeEffects: RuntimeEffect[];
  enteredPlayTurn: number;
  evolvedThisTurn?: boolean;
}
