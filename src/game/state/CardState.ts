/**
 * CardState.ts - Individual card instance representation in the game.
 */

import { PlayerId } from '../engine/GamePhase';

export interface CardInstance {
  instanceId: string;
  cardId: string;
  ownerId: PlayerId;
  originalDeckIndex?: number;
}
