import { Deck, PokemonCard } from '../../../types';
import { DeckRule, FormatRuleset, RuleValidationIssue } from '../types';

export function isPrismStarCard(card?: PokemonCard): boolean {
  if (!card) return false;
  const name = (card.name || '').toLowerCase();
  return name.includes('prism star') || name.includes('estrela prisma') || name.includes('◇');
}

export class PrismStarRule implements DeckRule {
  readonly id = 'PRISM_STAR_LIMIT';
  readonly name = 'Limite de Estrela Prisma';

  validate(
    deck: Deck,
    cardMap: Record<string, PokemonCard>,
    _ruleset: FormatRuleset
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];
    const prismCounts: Record<string, number> = {};

    for (const item of deck.cards) {
      const card = cardMap[item.cardId];
      if (card && isPrismStarCard(card)) {
        const key = card.name.toLowerCase();
        prismCounts[key] = (prismCounts[key] || 0) + (item.quantity || 0);
      }
    }

    for (const [name, count] of Object.entries(prismCounts)) {
      if (count > 1) {
        issues.push({
          type: 'error',
          rule: this.id,
          message: `A carta Estrela Prisma "${name}" só permite no máximo 1 cópia por deck (atual: ${count}).`,
        });
      }
    }

    return issues;
  }
}
