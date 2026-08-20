/**
 * DamageEffect.ts - Resolves direct DAMAGE effects.
 */

import { EffectResolver } from '../EffectResolver';
import { DamageEffectDefinition } from '../EffectTypes';
import { SerializableEffectContext } from '../EffectContext';
import { EffectResult } from '../EffectResult';
import { GameState } from '../../engine/GameState';
import { SeededRandom } from '../../rng/SeededRandom';
import { GameEvent } from '../../events/EventBus';

export class DamageEffectResolver implements EffectResolver {
  public resolve(state: GameState, effect: DamageEffectDefinition, context: SerializableEffectContext, rng: SeededRandom): EffectResult {
    const opponent = state.players[context.opponentId];
    if (!opponent || !opponent.activePokemon) {
      return { success: false, state, events: [], error: { code: 'TARGET_NOT_FOUND', message: 'Opponent active Pokémon not found.' } };
    }

    opponent.activePokemon.damage += effect.amount;

    const timestamp = Date.now();
    const ev: GameEvent = {
      id: `evt_dmg_${timestamp}`,
      type: 'DAMAGE_DEALT',
      playerId: context.controllerId,
      sourceActionId: context.sourceActionId,
      timestamp,
    } as any;

    return { success: true, state, events: [ev] };
  }
}
