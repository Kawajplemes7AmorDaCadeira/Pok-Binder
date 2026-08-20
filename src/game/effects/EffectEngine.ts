/**
 * EffectEngine.ts - Core execution engine for declarative effects.
 */

import { GameState } from '../engine/GameState';
import { EffectDefinition } from './EffectTypes';
import { SerializableEffectContext } from './EffectContext';
import { EffectResult } from './EffectResult';
import { EffectRegistry } from './EffectRegistry';
import { SeededRandom } from '../rng/SeededRandom';
import { GameEvent } from '../events/EventBus';
import { DrawEffectResolver } from './resolvers/DrawEffect';
import { DamageEffectResolver } from './resolvers/DamageEffect';
import { HealEffectResolver } from './resolvers/HealEffect';
import { CoinFlipEffectResolver } from './resolvers/CoinFlipEffect';

// Register core resolvers automatically
EffectRegistry.register('DRAW', new DrawEffectResolver());
EffectRegistry.register('DAMAGE', new DamageEffectResolver());
EffectRegistry.register('HEAL', new HealEffectResolver());
EffectRegistry.register('COIN_FLIP', new CoinFlipEffectResolver());

export class EffectEngine {
  public static resolve(state: GameState, effects: EffectDefinition[], context: SerializableEffectContext): EffectResult {
    let currentState = state;
    const allEvents: GameEvent[] = [];
    const rng = SeededRandom.fromState(currentState.rng);

    for (const effect of effects) {
      const resolver = EffectRegistry.get(effect.type);
      if (!resolver) {
        const failEv: GameEvent = {
          id: `evt_fail_${Date.now()}`,
          type: 'EFFECT_FAILED',
          playerId: context.controllerId,
          sourceActionId: context.sourceActionId,
          timestamp: Date.now(),
          effectType: effect.type,
        } as any;
        allEvents.push(failEv);
        return {
          success: false,
          state: currentState,
          events: allEvents,
          error: { code: 'UNSUPPORTED_EFFECT', message: `Effect type ${effect.type} is not registered.` },
        };
      }

      const res = resolver.resolve(currentState, effect, context, rng);
      currentState = res.state;
      allEvents.push(...res.events);

      if (!res.success) {
        return {
          success: false,
          state: currentState,
          events: allEvents,
          error: res.error,
        };
      }

      if (res.pendingResolution) {
        currentState.rng = rng.getState();
        return {
          success: true,
          state: currentState,
          events: allEvents,
          pendingResolution: res.pendingResolution,
        };
      }
    }

    currentState.rng = rng.getState();
    return {
      success: true,
      state: currentState,
      events: allEvents,
    };
  }
}
