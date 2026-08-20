/**
 * DrawEffect.ts - Resolves DRAW effects.
 */

import { EffectResolver } from '../EffectResolver';
import { DrawEffectDefinition } from '../EffectTypes';
import { SerializableEffectContext } from '../EffectContext';
import { EffectResult } from '../EffectResult';
import { GameState } from '../../engine/GameState';
import { SeededRandom } from '../../rng/SeededRandom';
import { GameEvent } from '../../events/EventBus';

export class DrawEffectResolver implements EffectResolver {
  public resolve(state: GameState, effect: DrawEffectDefinition, context: SerializableEffectContext, rng: SeededRandom): EffectResult {
    const player = state.players[context.controllerId];
    if (!player) {
      return { success: false, state, events: [], error: { code: 'PLAYER_NOT_FOUND', message: 'Controller not found.' } };
    }

    const events: GameEvent[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < effect.amount; i++) {
      if (player.deck.length === 0) {
        state.status = 'FINISHED';
        state.phase = 'GAME_OVER';
        state.winner = context.opponentId;
        state.winReason = 'DECK_OUT';
        break;
      }
      const card = player.deck.shift()!;
      player.hand.push(card);

      const ev: GameEvent = {
        id: `evt_draw_${timestamp}_${i}`,
        type: 'CARD_DRAWN',
        playerId: context.controllerId,
        sourceActionId: context.sourceActionId,
        timestamp,
        cardInstanceId: card.instanceId,
      } as any;
      events.push(ev);
    }

    return { success: true, state, events };
  }
}
