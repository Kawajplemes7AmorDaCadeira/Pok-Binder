import { Deck, PokemonCard } from '../../../types';
import { DeckRule, FormatRuleset, RuleValidationIssue } from '../types';

export class BasicPokemonRule implements DeckRule {
  readonly id = 'BASIC_POKEMON_REQUIRED';
  readonly name = 'Pokémon Básico Obrigatório';

  validate(
    deck: Deck,
    cardMap: Record<string, PokemonCard>,
    ruleset: FormatRuleset
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];
    if (!ruleset.requiresBasicPokemon) return issues;

    const totalCards = deck.cards.reduce((sum, c) => sum + (c.quantity || 0), 0);
    if (totalCards === 0) return issues;

    let basicPokemonCount = 0;

    for (const item of deck.cards) {
      const card = cardMap[item.cardId];
      if (card) {
        const cat = (card.category || '').toLowerCase();
        const stage = (card.stage || '').toLowerCase();

        const isPokemon = cat.includes('pokemon') || card.hp !== undefined;
        const isBasic =
          stage === 'basic' ||
          stage === 'básico' ||
          stage === 'basico' ||
          (isPokemon && !card.evolvesFrom && (!stage || stage === 'basic'));

        if (isBasic) {
          basicPokemonCount += item.quantity || 0;
        }
      }
    }

    if (basicPokemonCount === 0) {
      issues.push({
        type: 'warning',
        rule: this.id,
        message: 'Um deck de jogo necessita de pelo menos 1 Pokémon Básico para abrir a partida.',
      });
    }

    return issues;
  }
}
