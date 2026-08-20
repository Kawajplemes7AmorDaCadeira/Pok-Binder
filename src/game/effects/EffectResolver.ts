/**
 * EffectResolver.ts - Interface for individual effect type resolvers.
 */

import { GameState } from '../engine/GameState';
import { EffectDefinition } from './EffectTypes';
import { SerializableEffectContext } from './EffectContext';
import { EffectResult } from './EffectResult';
import { SeededRandom } from '../rng/SeededRandom';

export interface EffectResolver {
  resolve(state: GameState, effect: EffectDefinition, context: SerializableEffectContext, rng: SeededRandom): EffectResult;
}
