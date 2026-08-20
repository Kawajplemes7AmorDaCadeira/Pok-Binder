import { Deck, DeckValidationResult, PokemonCard } from '../types';
import { RuleBasedDeckValidator, deckValidatorInstance } from './deckValidator/index';

export * from './deckValidator/index';

/**
 * DeckValidator facade ensuring 100% backward-compatibility
 * while leveraging the new extensible rule-based engine.
 */
export class DeckValidator {
  public static isBasicEnergy(card?: PokemonCard): boolean {
    return RuleBasedDeckValidator.isBasicEnergy(card);
  }

  public static isStandardLegal(card?: PokemonCard): boolean {
    return RuleBasedDeckValidator.isStandardLegal(card);
  }

  public static isAceSpec(card?: PokemonCard): boolean {
    return RuleBasedDeckValidator.isAceSpec(card);
  }

  public static isRadiantPokemon(card?: PokemonCard): boolean {
    return RuleBasedDeckValidator.isRadiantPokemon(card);
  }

  public static isPrismStar(card?: PokemonCard): boolean {
    return RuleBasedDeckValidator.isPrismStar(card);
  }

  public static validate(deck: Deck, cardMap: Record<string, PokemonCard>): DeckValidationResult {
    return deckValidatorInstance.validate(deck, cardMap);
  }
}
