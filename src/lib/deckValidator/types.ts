import { Deck, PokemonCard } from '../../types';

export type RuleSeverity = 'error' | 'warning' | 'info';

export interface RuleValidationIssue {
  type: RuleSeverity;
  rule: string;
  message: string;
  cardId?: string;
  cardName?: string;
}

export interface FormatRuleset {
  id: string;
  name: string;
  deckSize: number;
  maxCopiesPerCard: number;
  allowedRegulationMarks?: string[];
  allowedSeries?: string[];
  bannedCardNames?: string[];
  legalReprints?: string[];
  maxAceSpec?: number;
  maxRadiant?: number;
  maxPrismStar?: number;
  requiresBasicPokemon?: boolean;
}

export interface DeckRule {
  readonly id: string;
  readonly name: string;
  validate(
    deck: Deck,
    cardMap: Record<string, PokemonCard>,
    ruleset: FormatRuleset
  ): RuleValidationIssue[];
}
