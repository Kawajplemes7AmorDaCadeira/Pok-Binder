import { Deck, PokemonCard } from '../../../types';
import { DeckRule, FormatRuleset, RuleValidationIssue } from '../types';

export function isBasicEnergyCard(card?: PokemonCard): boolean {
  if (!card) return false;
  const name = (card.name || '').toLowerCase();
  const cat = (card.category || '').toLowerCase();

  if (cat.includes('energy') || name.includes('energia') || name.includes('energy')) {
    if (
      name.includes('básica') ||
      name.includes('basica') ||
      name.includes('basic') ||
      (!name.includes('especial') && !name.includes('special'))
    ) {
      return true;
    }
  }
  return false;
}

export class CardCopyLimitRule implements DeckRule {
  readonly id = 'CARD_COPY_LIMIT';
  readonly name = 'Limite de Cópias por Carta';

  validate(
    deck: Deck,
    cardMap: Record<string, PokemonCard>,
    ruleset: FormatRuleset
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];
    const nameCounts: Record<string, { count: number; sample?: PokemonCard }> = {};

    for (const item of deck.cards) {
      const card = cardMap[item.cardId];
      const name = (card?.name || item.cardId).trim().toLowerCase();
      if (!nameCounts[name]) {
        nameCounts[name] = { count: 0, sample: card };
      }
      nameCounts[name].count += item.quantity || 0;
    }

    const limit = ruleset.maxCopiesPerCard;

    for (const [name, data] of Object.entries(nameCounts)) {
      if (isBasicEnergyCard(data.sample)) {
        continue; // Unlimited basic energy
      }

      if (data.count > limit) {
        issues.push({
          type: 'error',
          rule: this.id,
          cardId: data.sample?.id,
          cardName: data.sample?.name || name,
          message: `"${data.sample?.name || name}" excede o limite de ${limit} cópias permitidas no formato ${ruleset.name} (atual: ${data.count}).`,
        });
      }
    }

    return issues;
  }
}
