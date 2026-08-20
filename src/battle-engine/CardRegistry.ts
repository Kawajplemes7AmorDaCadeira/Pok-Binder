import { PokemonCard } from '../types';
import { CardEffect } from './types';

export interface CompiledCard {
  metadata: PokemonCard;
  category: 'Pokemon' | 'Trainer' | 'Energy';
  hp?: number;
  types?: string[];
  attacks?: {
    name: string;
    cost: string[];
    damage: string;
    effects: CardEffect[];
  }[];
  rules?: {
    text: string;
    effects: CardEffect[];
  }[];
}

class CardRegistrySingleton {
  private customHandlers: Record<string, (state: any, effect: any) => any> = {};

  // Register custom hand-crafted code for exceptional cards (e.g. Rare Candy or special abilities)
  registerCustom(cardId: string, handler: (state: any, effect: any) => any) {
    this.customHandlers[cardId] = handler;
  }

  getCustomHandler(cardId: string) {
    return this.customHandlers[cardId];
  }

  // Compile a PokemonCard from Catalog metadata into structural BattleCard
  compile(card: PokemonCard): CompiledCard {
    const category = (card.category || 'Pokemon') as 'Pokemon' | 'Trainer' | 'Energy';
    const attacks = (card.attacks || []).map((atk) => {
      const effects: CardEffect[] = [];
      const dmgValue = atk.damage ? parseInt(atk.damage.replace(/\D/g, '')) : 0;
      
      // Auto-compile damage DSL
      if (dmgValue > 0) {
        effects.push({
          type: 'DAMAGE',
          amount: dmgValue,
          target: 'OPPONENT_ACTIVE',
        });
      }

      // Add special effects based on attack description keywords
      const effectDesc = (atk.effect || '').toLowerCase();
      if (effectDesc.includes('discard') && effectDesc.includes('energy')) {
        effects.push({
          type: 'DISCARD',
          amount: 1,
          target: 'ACTIVE_ENERGY',
        });
      }
      if (effectDesc.includes('draw') && effectDesc.includes('card')) {
        effects.push({
          type: 'DRAW',
          amount: 2,
        });
      }

      return {
        name: atk.name,
        cost: atk.cost || [],
        damage: atk.damage || '0',
        effects,
      };
    });

    const rules = (card.rules || []).map((ruleText) => {
      const effects: CardEffect[] = [];
      const textLower = ruleText.toLowerCase();

      // DSL Compiling for Trainer Cards
      if (textLower.includes('search your deck') && textLower.includes('basic')) {
        effects.push({
          type: 'SEARCH',
          amount: 1,
          isBasic: true,
          targetZone: 'HAND',
        });
      } else if (textLower.includes('search your deck') && textLower.includes('pokemon')) {
        effects.push({
          type: 'SEARCH',
          amount: 1,
          targetZone: 'HAND',
        });
      } else if (textLower.includes('discard') && textLower.includes('draw 7')) {
        effects.push({
          type: 'CUSTOM',
          handlerId: 'PROF_RESEARCH_DISCARD_DRAW',
        });
      } else if (textLower.includes('evolve') && textLower.includes('rare candy')) {
        effects.push({
          type: 'CUSTOM',
          handlerId: 'RARE_CANDY_EVOLVE',
        });
      } else if (textLower.includes('iono') || (textLower.includes('shuffles') && textLower.includes('prizes'))) {
        effects.push({
          type: 'CUSTOM',
          handlerId: 'IONO_HAND_SHUFFLE',
        });
      }

      return {
        text: ruleText,
        effects,
      };
    });

    return {
      metadata: card,
      category,
      hp: card.hp,
      types: card.types,
      attacks,
      rules,
    };
  }
}

export const CardRegistry = new CardRegistrySingleton();
