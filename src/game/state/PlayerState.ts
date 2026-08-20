/**
 * PlayerState.ts - Represents a player's complete state in the game.
 */

import { PlayerId } from '../engine/GamePhase';
import { CardInstance } from './CardState';
import { PokemonInPlay, RuntimeEffect } from './PokemonState';

export interface PlayerTurnFlags {
  supporterCount: number;
  manualEnergyAttachments: number;
  retreatedThisTurn: boolean;
}

export interface PlayerState {
  id: PlayerId;
  deck: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  prizeCards: CardInstance[];
  activePokemon?: PokemonInPlay;
  bench: PokemonInPlay[];
  supporterUsedThisTurn: boolean;
  energyAttachedThisTurn: boolean;
  turnFlags: PlayerTurnFlags;
  effects: RuntimeEffect[];
}
