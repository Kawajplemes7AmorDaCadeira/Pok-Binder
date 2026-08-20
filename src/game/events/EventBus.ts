/**
 * EventBus.ts - Internal event system for game engine events.
 */

import { PlayerId } from '../engine/GamePhase';

export type GameEventType =
  | 'GAME_CREATED'
  | 'ACTION_REJECTED'
  | 'TURN_STARTED'
  | 'CARD_DRAWN'
  | 'CARD_PLAYED'
  | 'POKEMON_BENCHED'
  | 'POKEMON_EVOLVED'
  | 'ENERGY_ATTACHED'
  | 'TRAINER_PLAYED'
  | 'ATTACK_STARTED'
  | 'DAMAGE_DEALT'
  | 'POKEMON_KNOCKED_OUT'
  | 'PRIZE_TAKEN'
  | 'TURN_ENDED'
  | 'GAME_ENDED';

export interface BaseGameEvent {
  id: string;
  type: GameEventType;
  playerId?: PlayerId;
  sourceActionId: string;
  timestamp: number;
}

export interface CardDrawnEvent extends BaseGameEvent {
  type: 'CARD_DRAWN';
  playerId: PlayerId;
  cardInstanceId: string;
}

export interface EnergyAttachedEvent extends BaseGameEvent {
  type: 'ENERGY_ATTACHED';
  playerId: PlayerId;
  energyInstanceId: string;
  targetPokemonInstanceId: string;
}

export interface TurnStartedEvent extends BaseGameEvent {
  type: 'TURN_STARTED';
  playerId: PlayerId;
  turnNumber: number;
}

export interface TurnEndedEvent extends BaseGameEvent {
  type: 'TURN_ENDED';
  playerId: PlayerId;
}

export type GameEvent =
  | BaseGameEvent
  | CardDrawnEvent
  | EnergyAttachedEvent
  | TurnStartedEvent
  | TurnEndedEvent;

export class EventBus {
  private listeners: Array<(event: GameEvent) => void> = [];

  public subscribe(listener: (event: GameEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public clear(): void {
    this.listeners = [];
  }
}
