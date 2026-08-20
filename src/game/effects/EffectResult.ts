/**
 * EffectResult.ts - Result structure returned by effect resolvers.
 */

import { GameState } from '../engine/GameState';
import { GameEvent } from '../events/EventBus';
import { EffectResolutionState } from './EffectResolutionState';

export interface EffectResolutionError {
  code: string;
  message: string;
}

export interface EffectResult {
  success: boolean;
  state: GameState;
  events: GameEvent[];
  pendingResolution?: EffectResolutionState;
  error?: EffectResolutionError;
}
