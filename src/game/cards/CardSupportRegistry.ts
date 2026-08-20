/**
 * CardSupportRegistry.ts - Determines simulation support level (FULL, PARTIAL, UNSUPPORTED) for cards.
 */

import { GameCardRegistry } from './GameCardRegistry';
import { EffectRegistry } from '../effects/EffectRegistry';

export type SimulationSupportLevel = 'FULL' | 'PARTIAL' | 'UNSUPPORTED';

export class CardSupportRegistry {
  public static getSupportLevel(cardId: string): SimulationSupportLevel {
    const def = GameCardRegistry.get(cardId);
    if (!def) return 'UNSUPPORTED';

    if (def.attacks) {
      for (const att of def.attacks) {
        if (att.effects) {
          for (const eff of att.effects) {
            if (!EffectRegistry.has(eff.type)) {
              return 'PARTIAL';
            }
          }
        }
      }
    }

    return 'FULL';
  }
}
