/**
 * HealEffect.ts - Resolves HEAL effects.
 */

import { EffectResolver } from '../EffectResolver';
import { HealEffectDefinition } from '../EffectTypes';
import { SerializableEffectContext } from '../EffectContext';
import { EffectResult } from '../EffectResult';
import { GameState } from '../../engine/GameState';
import { SeededRandom } from '../../rng/SeededRandom';
import { GameEvent } from '../../events/EventBus';

export class HealEffectResolver implements EffectResolver {
  public resolve(state: GameState, effect: HealEffectDefinition, context: SerializableEffectContext, rng: SeededRandom): EffectResult {
    const player = state.players[context.controllerId];
    if (!player || !player.activePokemon) {
      return { success: false, state, events: [], error: { code: 'TARGET_NOT_FOUND', message: 'Player active Pokémon not found.' } };
    }

    player.activePokemon.damage = Math.max(0, player.activePokemon.damage - effect.amount);

    const timestamp = Date.now();
    const ev: GameEvent = {
      id: `evt_heal_${timestamp}`,
      type: 'HEAL_APPLIED',
      playerId: context.controllerId,
      sourceActionId: context.sourceActionId,
      timestamp,
    } as any;

    return { success: true, state, events: [ev] };
  }
}
