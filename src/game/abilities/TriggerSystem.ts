/**
 * TriggerSystem.ts - Detects events and triggers abilities or reactive effects.
 */

import { GameState } from '../engine/GameState';
import { GameEvent } from '../events/EventBus';

export class TriggerSystem {
  public static handleEvent(state: GameState, event: GameEvent): { state: GameState; events: GameEvent[] } {
    // Placeholder for triggered abilities logic
    return { state, events: [] };
  }
}
