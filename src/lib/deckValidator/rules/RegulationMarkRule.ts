import { Deck, PokemonCard } from '../../../types';
import { DeckRule, FormatRuleset, RuleValidationIssue } from '../types';
import { isBasicEnergyCard } from './CardCopyLimitRule';

export function isCardLegalInRuleset(card: PokemonCard | undefined, ruleset: FormatRuleset): boolean {
  if (!card) return true; // Fail-safe during lazy loading

  // 1. Basic energy is always legal
  if (isBasicEnergyCard(card)) return true;

  // 2. Formats with unrestricted marks (e.g. Expanded / Pocket / Custom)
  if (!ruleset.allowedRegulationMarks && !ruleset.allowedSeries) {
    return true;
  }

  // 3. Check regulation mark
  if (card.regulationMark && ruleset.allowedRegulationMarks) {
    const mark = card.regulationMark.toUpperCase();
    if (ruleset.allowedRegulationMarks.includes(mark)) {
      return true;
    }
  }

  // 4. Check Set ID or Series
  const setId = (card.setId || '').toLowerCase();
  if (ruleset.allowedSeries) {
    for (const prefix of ruleset.allowedSeries) {
      if (setId.startsWith(prefix.toLowerCase())) {
        return true;
      }
    }
  }

  // 5. Check legal reprints
  if (ruleset.legalReprints) {
    const nameLower = (card.name || '').toLowerCase().trim();
    if (ruleset.legalReprints.includes(nameLower)) {
      return true;
    }
  }

  return false;
}

export class RegulationMarkRule implements DeckRule {
  readonly id = 'REGULATION_MARK_LEGALITY';
  readonly name = 'Legalidade de Formato e Marca de Regulamento';

  validate(
    deck: Deck,
    cardMap: Record<string, PokemonCard>,
    ruleset: FormatRuleset
  ): RuleValidationIssue[] {
    const issues: RuleValidationIssue[] = [];

    // Only validate if ruleset defines restrictions (e.g., Standard / Rotation)
    if (!ruleset.allowedRegulationMarks && !ruleset.allowedSeries) {
      return issues;
    }

    for (const item of deck.cards) {
      const card = cardMap[item.cardId];
      if (card && !isCardLegalInRuleset(card, ruleset)) {
        issues.push({
          type: 'error',
          rule: this.id,
          cardId: card.id,
          cardName: card.name,
          message: `"${card.name}" (${card.setName || card.setId}) não é válida no formato ${ruleset.name}. Requer marca de regulamento ${ruleset.allowedRegulationMarks?.join(', ')} (Série Scarlet & Violet ou mais recente).`,
        });
      }
    }

    return issues;
  }
}
