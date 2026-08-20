/**
 * GameState.ts - Immutable and serializable root state of a Pokémon TCG match.
 */

import { GamePhase, PlayerId, GameWinReason } from './GamePhase';
import { PlayerState } from '../state/PlayerState';
import { CardInstance } from '../state/CardState';
import { RuntimeEffect } from '../state/PokemonState';
import { GameAction } from './GameAction';
import { RNGState } from '../rng/SeededRandom';

export interface SetupState {
  mulligans: Record<PlayerId, number>;
  activeSelected: Record<PlayerId, boolean>;
  setupConfirmed: Record<PlayerId, boolean>;
  prizesPlaced: boolean;
  startingPlayerResolved: boolean;
}

export type PendingChoiceType =
  | 'SELECT_POKEMON'
  | 'SELECT_CARDS'
  | 'COIN_FLIP'
  | 'CHOOSE_ATTACK'
  | 'SELECT_ZONE_TARGET'
  | 'SELECT_NEW_ACTIVE'
  | 'TAKE_PRIZE'
  | 'MULLIGAN_COMPENSATION';

export interface PendingChoice {
  id: string;
  player: PlayerId;
  type: PendingChoiceType;
  min: number;
  max: number;
  filters: {
    owner?: 'SELF' | 'OPPONENT' | 'ANY';
    zones?: string[];
    categories?: string[];
    isBasic?: boolean;
    cardName?: string;
  };
  options?: any[];
}

export interface GameActionRecord {
  action: GameAction;
  turnNumber: number;
  phase: GamePhase;
  sequence: number;
  resultingEventIds: string[];
}

export interface GameState {
  gameId: string;
  engineVersion: string;
  rulesetVersion: string;
  status: 'SETUP' | 'IN_PROGRESS' | 'FINISHED';
  phase: GamePhase;
  turnNumber: number;
  activePlayerId: PlayerId;
  firstPlayerId: PlayerId;
  players: Record<PlayerId, PlayerState>;
  stadium?: CardInstance;
  setupState: SetupState;
  pendingChoices: PendingChoice[];
  activeEffects: RuntimeEffect[];
  actionHistory: GameActionRecord[];
  winner?: PlayerId;
  winReason?: GameWinReason;
  rng: RNGState;
}

export const GAME_ENGINE_VERSION = '0.1.0';
