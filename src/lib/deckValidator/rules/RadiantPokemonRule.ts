import { Deck, PokemonCard } from '../../../types';
import { DeckRule, FormatRuleset, RuleValidationIssue } from '../types';

export function isRadiantPokemonCard(card?: PokemonCard): boolean {
  if (!card) return false;
  const name = (card.name || '').toLowerCase();
  const text = (card.description || card.rules?.join(' ') || '').toLowerCase();
  return name.includes('radiant') || name.includes('radiante') || text.includes('radiant pokémon');
}

export class RadiantPokemonRule implements DeckRule {
  readonly id = 'RADIANT_POKEMON_LIMIT';
  readonly name = 'Limite de Pokémon Radiante';

  validate(
    deck: Deck,
    cardMap: Record<string, PokemonCard>,
    ruleset: FormatRuleset
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];
    const maxAllowed = ruleset.maxRadiant ?? 1;

    let count = 0;
    for (const item of deck.cards) {
      const card = cardMap[item.cardId];
      if (card && isRadiantPokemonCard(card)) {
        count += item.quantity || 0;
      }
    }

    if (count > maxAllowed) {
      issues.push({
        type: 'error',
        rule: this.id,
        message: `Você só pode ter no máximo ${maxAllowed} Pokémon Radiante em todo o deck (atual: ${count}).`,
      });
    }

    return issues;
  }
}
