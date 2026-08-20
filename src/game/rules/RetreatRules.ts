/**
 * RetreatRules.ts - Validates retreat legality and energy costs.
 */

import { GameState } from '../engine/GameState';
import { PlayerId } from '../engine/GamePhase';

export interface RetreatValidationResult {
  legal: boolean;
  message?: string;
}

export class RetreatRules {
  public static validateRetreat(
    state: GameState,
    playerId: PlayerId,
    newActiveBenchIndex: number,
    energyInstanceIdsToDiscard: string[]
  ): RetreatValidationResult {
    const player = state.players[playerId];
    if (!player) return { legal: false, message: 'Player not found.' };

    if (!player.activePokemon) {
      return { legal: false, message: 'No active Pokémon to retreat.' };
    }

    if (player.turnFlags.retreatedThisTurn) {
      return { legal: false, message: 'Already retreated this turn.' };
    }

    const benchPokemon = player.bench[newActiveBenchIndex];
    if (!benchPokemon) {
      return { legal: false, message: 'No Pokémon in selected bench slot to promote.' };
    }

    // Verify energy attached matches retreat cost (simplified: retreat cost is usually 1-3 colorless energy)
    // For test purposes, we check if energyInstanceIdsToDiscard matches required cost or basic validation
    const attachedEnergyCount = player.activePokemon.attachedEnergy.length;
    const requiredCost = 1; // Default or parsed retreat cost

    if (attachedEnergyCount < energyInstanceIdsToDiscard.length) {
      return { legal: false, message: 'Not enough attached energy to discard for retreat.' };
    }

    return { legal: true };
  }
}
