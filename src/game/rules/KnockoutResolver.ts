/**
 * KnockoutResolver.ts - Detects knockouts, handles card disposal to discard pile, and determines prize values.
 */

import { GameState } from '../engine/GameState';
import { PlayerId } from '../engine/GamePhase';
import { PokemonInPlay } from '../state/PokemonState';

export interface KnockoutResult {
  isKnockedOut: boolean;
  prizeValue: number;
}

export class KnockoutResolver {
  public static checkKnockout(pokemon: PokemonInPlay, maxHp: number = 100): KnockoutResult {
    const isKnockedOut = pokemon.damage >= maxHp;
    const prizeValue = 1; // Default 1 prize for normal Pokémon

    return {
      isKnockedOut,
      prizeValue,
    };
  }

  public static handleKnockout(state: GameState, ownerId: PlayerId, pokemon: PokemonInPlay): void {
    const player = state.players[ownerId];
    if (!player) return;

    // Move evolution stack, attached energy, and attached tools to discard pile
    player.discardPile.push(...pokemon.evolutionStack);
    for (const en of pokemon.attachedEnergy) {
      player.discardPile.push({
        instanceId: en.cardInstanceId,
        cardId: 'energy-discarded',
        ownerId,
      });
    }
    player.discardPile.push(...pokemon.attachedCards);
  }
}
