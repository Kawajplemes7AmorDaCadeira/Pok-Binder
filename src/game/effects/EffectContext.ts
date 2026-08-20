/**
 * EffectContext.ts - Context passed during effect execution.
 */

import { PlayerId } from '../engine/GamePhase';

export interface SerializableEffectContext {
  sourceActionId: string;
  sourceCardInstanceId?: string;
  sourcePokemonInstanceId?: string;
  controllerId: PlayerId;
  opponentId: PlayerId;
  attackIndex?: number;
  abilityIndex?: number;
}
