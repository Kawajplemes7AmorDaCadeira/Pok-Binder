import { Deck, DeckValidationResult, PokemonCard } from '../../types';
import { DeckRule, FormatRuleset, RuleValidationIssue } from './types';
import { getFormatRuleset, StandardFormat } from './formats';
import {
  DeckSizeRule,
  CardCopyLimitRule,
  AceSpecRule,
  RadiantPokemonRule,
  PrismStarRule,
  BasicPokemonRule,
  RegulationMarkRule,
  isBasicEnergyCard,
  isAceSpecCard,
  isRadiantPokemonCard,
  isPrismStarCard,
  isCardLegalInRuleset,
} from './rules';

export * from './types';
export * from './formats';
export * from './rules';

export class RuleBasedDeckValidator {
  private rules: DeckRule[] = [
    new DeckSizeRule(),
    new CardCopyLimitRule(),
    new AceSpecRule(),
    new RadiantPokemonRule(),
    new PrismStarRule(),
    new BasicPokemonRule(),
    new RegulationMarkRule(),
  ];

  public addRule(rule: DeckRule): this {
    this.rules.push(rule);
    return this;
  }

  public validate(
    deck: Deck,
    cardMap: Record<string, PokemonCard>,
    customRuleset?: FormatRuleset
  ): DeckValidationResult {
    const ruleset = customRuleset || getFormatRuleset(deck.format);
    const allIssues: RuleValidationIssue[] = [];

    let totalCards = 0;
    let pokemonCount = 0;
    let trainerCount = 0;
    let energyCount = 0;

    for (const deckCard of deck.cards) {
      const card = cardMap[deckCard.cardId];
      const qty = deckCard.quantity || 0;
      totalCards += qty;

      if (card) {
        const cat = (card.category || '').toLowerCase();
        if (cat.includes('pokemon') || card.hp !== undefined) {
          pokemonCount += qty;
        } else if (cat.includes('trainer') || cat.includes('treinador')) {
          trainerCount += qty;
        } else if (cat.includes('energy') || cat.includes('energia')) {
          energyCount += qty;
        } else {
          pokemonCount += qty;
        }
      }
    }

    // Run every rule
    for (const rule of this.rules) {
      const issues = rule.validate(deck, cardMap, ruleset);
      allIssues.push(...issues);
    }

    const isValid = allIssues.filter((i) => i.type === 'error').length === 0;

    return {
      isValid,
      totalCards,
      pokemonCount,
      trainerCount,
      energyCount,
      issues: allIssues.map((i) => ({
        type: i.type,
        message: i.message,
        cardId: i.cardId,
        cardName: i.cardName,
      })),
    };
  }

  public static isStandardLegal(card?: PokemonCard): boolean {
    return isCardLegalInRuleset(card, StandardFormat);
  }

  public static isBasicEnergy(card?: PokemonCard): boolean {
    return isBasicEnergyCard(card);
  }

  public static isAceSpec(card?: PokemonCard): boolean {
    return isAceSpecCard(card);
  }

  public static isRadiantPokemon(card?: PokemonCard): boolean {
    return isRadiantPokemonCard(card);
  }

  public static isPrismStar(card?: PokemonCard): boolean {
    return isPrismStarCard(card);
  }
}

// Singleton validator instance
export const deckValidatorInstance = new RuleBasedDeckValidator();
