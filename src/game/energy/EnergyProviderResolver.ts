/**
 * EnergyProviderResolver.ts - Resolves energy types and units provided by energy cards.
 */

import { CardInstance } from '../state/CardState';

export interface ProvidedEnergyUnits {
  units: number;
  types: string[];
}

export class EnergyProviderResolver {
  public static getProvidedEnergy(energyCard: CardInstance): ProvidedEnergyUnits {
    const cardId = energyCard.cardId.toLowerCase();
    if (cardId.includes('fire') || cardId.includes('fogo')) {
      return { units: 1, types: ['FIRE'] };
    }
    if (cardId.includes('water') || cardId.includes('agua')) {
      return { units: 1, types: ['WATER'] };
    }
    if (cardId.includes('grass') || cardId.includes('grama')) {
      return { units: 1, types: ['GRASS'] };
    }
    if (cardId.includes('lightning') || cardId.includes('raio')) {
      return { units: 1, types: ['LIGHTNING'] };
    }
    return { units: 1, types: ['COLORLESS'] };
  }
}
