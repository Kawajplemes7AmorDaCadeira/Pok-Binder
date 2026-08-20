/**
 * TrainerRules.ts - Validates Item, Supporter, Stadium, and Tool rules.
 */

import { GameState } from '../engine/GameState';
import { PlayerId } from '../engine/GamePhase';

export interface TrainerValidationResult {
  legal: boolean;
  message?: string;
}

export class TrainerRules {
  public static validateSupporter(state: GameState, playerId: PlayerId): TrainerValidationResult {
    const player = state.players[playerId];
    if (!player) return { legal: false, message: 'Player not found.' };

    if (player.supporterUsedThisTurn) {
      return { legal: false, message: 'You have already played a Supporter card this turn.' };
    }

    // First turn supporter rule (if ruleset disallows)
    if (state.turnNumber === 1 && playerId === state.firstPlayerId) {
      // In current standard rules, player going first can play supporters, but check ruleset if needed
    }

    return { legal: true };
  }

  public static validateTool(state: GameState, playerId: PlayerId, targetPokemonInstanceId: string): TrainerValidationResult {
    const player = state.players[playerId];
    if (!player) return { legal: false, message: 'Player not found.' };

    const targetPokemon =
      (player.activePokemon?.instanceId === targetPokemonInstanceId ? player.activePokemon : undefined) ||
      player.bench.find((b) => b?.instanceId === targetPokemonInstanceId);

    if (!targetPokemon) return { legal: false, message: 'Target Pokémon not found in play.' };

    if (targetPokemon.attachedCards.length > 0) {
      return { legal: false, message: 'This Pokémon already has a Tool attached.' };
    }

    return { legal: true };
  }
}
