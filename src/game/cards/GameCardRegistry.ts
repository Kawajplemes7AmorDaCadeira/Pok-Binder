/**
 * GameCardRegistry.ts - Registry for card definitions and simulated effects.
 */

import { EffectDefinition } from '../effects/EffectTypes';
import { GameAbilityDefinition } from '../abilities/AbilityDefinition';

export interface GameCardDefinition {
  cardId: string;
  name: string;
  supertype: 'POKEMON' | 'TRAINER' | 'ENERGY';
  subtypes?: string[];
  hp?: number;
  attacks?: {
    name: string;
    cost: string[];
    damage?: number;
    effects?: EffectDefinition[];
  }[];
  abilities?: GameAbilityDefinition[];
}

export class GameCardRegistry {
  private static definitions: Map<string, GameCardDefinition> = new Map();

  public static register(def: GameCardDefinition): void {
    this.definitions.set(def.cardId, def);
  }

  public static get(cardId: string): GameCardDefinition | undefined {
    return this.definitions.get(cardId);
  }
}
