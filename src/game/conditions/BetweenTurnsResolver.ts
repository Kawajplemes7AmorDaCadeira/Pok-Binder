/**
 * BetweenTurnsResolver.ts - Resolves between-turn conditions (Poison, Burn, etc.).
 */

import { GameState } from '../engine/GameState';
import { PlayerId } from '../engine/GamePhase';
import { SeededRandom } from '../rng/SeededRandom';
import { GameEvent } from '../events/EventBus';

export class BetweenTurnsResolver {
  public static resolveBetweenTurns(state: GameState): { state: GameState; events: GameEvent[] } {
    const events: GameEvent[] = [];
    const rng = SeededRandom.fromState(state.rng);
    const timestamp = Date.now();

    for (const pid of ['P1', 'P2'] as PlayerId[]) {
      const player = state.players[pid];
      if (player && player.activePokemon) {
        // Resolve Poisoned (takes 10 damage counters = 10 damage per poison stack)
        const hasPoison = player.activePokemon.specialConditions.includes('POISONED');
        if (hasPoison) {
          player.activePokemon.damage += 10;
          events.push({
            id: `evt_poison_${timestamp}_${pid}`,
            type: 'SPECIAL_CONDITION_APPLIED',
            playerId: pid,
            sourceActionId: 'between_turns',
            timestamp,
            condition: 'POISONED',
          } as any);
        }
      }
    }

    state.rng = rng.getState();
    return { state, events };
  }
}
