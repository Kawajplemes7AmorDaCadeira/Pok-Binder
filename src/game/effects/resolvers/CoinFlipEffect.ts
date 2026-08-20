/**
 * CoinFlipEffect.ts - Resolves COIN_FLIP effects deterministically via SeededRandom.
 */

import { EffectResolver } from '../EffectResolver';
import { CoinFlipEffectDefinition } from '../EffectTypes';
import { SerializableEffectContext } from '../EffectContext';
import { EffectResult } from '../EffectResult';
import { GameState } from '../../engine/GameState';
import { SeededRandom } from '../../rng/SeededRandom';
import { GameEvent } from '../../events/EventBus';

export class CoinFlipEffectResolver implements EffectResolver {
  public resolve(state: GameState, effect: CoinFlipEffectDefinition, context: SerializableEffectContext, rng: SeededRandom): EffectResult {
    const results: ('HEADS' | 'TAILS')[] = [];
    for (let i = 0; i < effect.count; i++) {
      const isHeads = rng.coinFlip();
      results.push(isHeads ? 'HEADS' : 'TAILS');
    }

    const timestamp = Date.now();
    const ev: GameEvent = {
      id: `evt_coin_${timestamp}`,
      type: 'COIN_FLIPPED',
      playerId: context.controllerId,
      sourceActionId: context.sourceActionId,
      timestamp,
      results,
    } as any;

    return { success: true, state, events: [ev] };
  }
}
