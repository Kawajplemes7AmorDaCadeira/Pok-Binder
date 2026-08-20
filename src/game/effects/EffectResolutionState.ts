/**
 * EffectResolutionState.ts - State representation for paused effect sequences awaiting choices.
 */

import { EffectDefinition } from './EffectTypes';
import { SerializableEffectContext } from './EffectContext';

export interface EffectResolutionState {
  sequenceId: string;
  sourceActionId: string;
  effects: EffectDefinition[];
  currentIndex: number;
  context: SerializableEffectContext;
  waitingForChoiceId?: string;
}
