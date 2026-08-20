/**
    * GameAction.ts - Discriminated Union definitions for all serializable game actions including evolution, trainers, retreat, attack, prizes, and promotion.
    */

import { PlayerId } from './GamePhase';

export type GameActionType =
  | 'START_GAME'
  | 'SET_ACTIVE_POKEMON'
  | 'PLAY_BASIC_POKEMON'
  | 'CONFIRM_SETUP'
  | 'DRAW_CARD'
  | 'ATTACH_ENERGY'
  | 'EVOLVE_POKEMON'
  | 'PLAY_ITEM'
  | 'PLAY_SUPPORTER'
  | 'PLAY_STADIUM'
  | 'ATTACH_TOOL'
  | 'RETREAT'
  | 'ATTACK'
  | 'SELECT_NEW_ACTIVE'
  | 'TAKE_PRIZE'
  | 'MAKE_CHOICE'
  | 'END_TURN';

export interface BaseGameAction {
  actionId: string;
  type: GameActionType;
  playerId: PlayerId;
  createdAt?: number;
}

export interface StartGameAction extends BaseGameAction {
  type: 'START_GAME';
}

export interface SetActivePokemonAction extends BaseGameAction {
  type: 'SET_ACTIVE_POKEMON';
  cardInstanceId: string;
}

export interface PlayBasicPokemonAction extends BaseGameAction {
  type: 'PLAY_BASIC_POKEMON';
  cardInstanceId: string;
  targetSlot: 'ACTIVE' | number;
}

export interface ConfirmSetupAction extends BaseGameAction {
  type: 'CONFIRM_SETUP';
}

export interface DrawCardAction extends BaseGameAction {
  type: 'DRAW_CARD';
  count?: number;
}

export interface AttachEnergyAction extends BaseGameAction {
  type: 'ATTACH_ENERGY';
  energyCardInstanceId: string;
  targetPokemonInstanceId: string;
}

export interface EvolvePokemonAction extends BaseGameAction {
  type: 'EVOLVE_POKEMON';
  evolutionCardInstanceId: string;
  targetPokemonInstanceId: string;
}

export interface PlayItemAction extends BaseGameAction {
  type: 'PLAY_ITEM';
  cardInstanceId: string;
}

export interface PlaySupporterAction extends BaseGameAction {
  type: 'PLAY_SUPPORTER';
  cardInstanceId: string;
}

export interface PlayStadiumAction extends BaseGameAction {
  type: 'PLAY_STADIUM';
  cardInstanceId: string;
}

export interface AttachToolAction extends BaseGameAction {
  type: 'ATTACH_TOOL';
  toolCardInstanceId: string;
  targetPokemonInstanceId: string;
}

export interface RetreatAction extends BaseGameAction {
  type: 'RETREAT';
  newActiveBenchIndex: number;
  energyInstanceIdsToDiscard: string[];
}

export interface AttackAction extends BaseGameAction {
  type: 'ATTACK';
  attackIndex: number;
}

export interface SelectNewActiveAction extends BaseGameAction {
  type: 'SELECT_NEW_ACTIVE';
  benchIndex: number;
}

export interface TakePrizeAction extends BaseGameAction {
  type: 'TAKE_PRIZE';
  prizeInstanceIds: string[];
}

export interface MakeChoiceAction extends BaseGameAction {
  type: 'MAKE_CHOICE';
  choiceId: string;
  selectedIds: string[];
}

export interface EndTurnAction extends BaseGameAction {
  type: 'END_TURN';
}

export type GameAction =
  | StartGameAction
  | SetActivePokemonAction
  | PlayBasicPokemonAction
  | ConfirmSetupAction
  | DrawCardAction
  | AttachEnergyAction
  | EvolvePokemonAction
  | PlayItemAction
  | PlaySupporterAction
  | PlayStadiumAction
  | AttachToolAction
  | RetreatAction
  | AttackAction
  | SelectNewActiveAction
  | TakePrizeAction
  | MakeChoiceAction
  | EndTurnAction;
