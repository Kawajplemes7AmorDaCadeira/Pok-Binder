import { Deck, PokemonCard } from '../../../types';
import { DeckRule, FormatRuleset, RuleValidationIssue } from '../types';

export function isAceSpecCard(card?: PokemonCard): boolean {
  if (!card) return false;
  const name = (card.name || '').toUpperCase();
  const text = (card.description || card.rules?.join(' ') || '').toUpperCase();
  return name.includes('ACE SPEC') || text.includes('ACE SPEC');
}

export class AceSpecRule implements DeckRule {
  readonly id = 'ACE_SPEC_LIMIT';
  readonly name = 'Limite de Cartas ACE SPEC';

  validate(
    deck: Deck,
    cardMap: Record<string, PokemonCard>,
    ruleset: FormatRuleset
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];
    const maxAllowed = ruleset.maxAceSpec ?? 1;

    let aceSpecCount = 0;
    const aceSpecCards: PokemonCard[] = [];

    for (const item of deck.cards) {
      const card = cardMap[item.cardId];
      if (card && isAceSpecCard(card)) {
        aceSpecCount += item.quantity || 0;
        aceSpecCards.push(card);
      }
    }

    if (aceSpecCount > maxAllowed) {
      issues.push({
        type: 'error',
        rule: this.id,
        message: `Você só pode ter no máximo ${maxAllowed} carta ACE SPEC em todo o deck (atual: ${aceSpecCount} cartas).`,
      });
    }

    return issues;
  }
}
