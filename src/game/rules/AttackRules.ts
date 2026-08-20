/**
 * AttackRules.ts - Validates attack legality and energy costs.
 */

import { GameState } from '../engine/GameState';
import { PlayerId } from '../engine/GamePhase';

export interface AttackValidationResult {
  legal: boolean;
  message?: string;
}

export class AttackRules {
  public static validateAttack(state: GameState, playerId: PlayerId, attackIndex: number): AttackValidationResult {
    const player = state.players[playerId];
    if (!player) return { legal: false, message: 'Player not found.' };

    if (!player.activePokemon) {
      return { legal: false, message: 'No active Pokémon to attack with.' };
    }

    if (state.phase !== 'MAIN' && state.phase !== 'ATTACK') {
      return { legal: false, message: 'Can only attack during Main/Attack phase.' };
    }

    // First turn restriction: going first player cannot attack on turn 1
    if (state.turnNumber === 1 && playerId === state.firstPlayerId) {
      return { legal: false, message: 'Player going first cannot attack on the first turn.' };
    }

    return { legal: true };
  }
}
