import { Deck, PokemonCard } from '../../../types';
import { DeckRule, FormatRuleset, RuleValidationIssue } from '../types';

export class DeckSizeRule implements DeckRule {
  readonly id = 'DECK_SIZE';
  readonly name = 'Tamanho do Deck';

  validate(
    deck: Deck,
    _cardMap: Record<string, PokemonCard>,
    ruleset: FormatRuleset
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];
    const totalCards = deck.cards.reduce((sum, c) => sum + (c.quantity || 0), 0);
    const expected = ruleset.deckSize;

    if (totalCards === 0) {
      issues.push({
        type: 'error',
        rule: this.id,
        message: 'O deck está completamente vazio. Adicione cartas para começar.',
      });
    } else if (totalCards < expected) {
      issues.push({
        type: 'warning',
        rule: this.id,
        message: `Deck possui apenas ${totalCards} de ${expected} cartas exigidas para o formato ${ruleset.name}.`,
      });
    } else if (totalCards > expected) {
      issues.push({
        type: 'error',
        rule: this.id,
        message: `Deck excede o limite de ${expected} cartas do formato ${ruleset.name} (atual: ${totalCards} cartas).`,
      });
    }

    return issues;
  }
}
