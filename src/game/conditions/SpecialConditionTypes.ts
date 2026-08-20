/**
    * SpecialConditionTypes.ts - Defines special conditions (Poisoned, Burned, Asleep, Paralyzed, Confused).
    */

import { PlayerId } from '../engine/GamePhase';

export type SpecialConditionType = 'POISONED' | 'BURNED' | 'ASLEEP' | 'PARALYZED' | 'CONFUSED';

export interface SpecialConditionState {
  type: SpecialConditionType;
  sourceCardInstanceId?: string;
  appliedTurn: number;
}
