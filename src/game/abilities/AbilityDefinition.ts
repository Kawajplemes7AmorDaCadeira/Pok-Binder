/**
 * AbilityDefinition.ts - Definitions for abilities (Activated, Triggered, Continuous).
 */

import { EffectDefinition } from '../effects/EffectTypes';

export type AbilityKind = 'ACTIVATED' | 'TRIGGERED' | 'CONTINUOUS';
export type AbilityUsageLimit = 'ONCE_PER_TURN' | 'ONCE_WHILE_IN_PLAY' | 'UNLIMITED';

export interface GameAbilityDefinition {
  name: string;
  kind: AbilityKind;
  effects?: EffectDefinition[];
  trigger?: {
    event: string;
  };
  usageLimit?: AbilityUsageLimit;
}
