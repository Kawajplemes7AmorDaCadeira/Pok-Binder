/**
 * Ruleset.ts - Official Pokémon TCG ruleset configurations.
 */

export interface FirstTurnRules {
  drawCard: boolean;
  canAttack: boolean;
  canPlaySupporter: boolean;
  canEvolve: boolean;
}

export interface BattleRuleset {
  id: string;
  name: string;
  deckSize: number;
  initialHandSize: number;
  prizeCount: number;
  maxBenchSize: number;
  firstTurn: FirstTurnRules;
  manualEnergyAttachmentsPerTurn: number;
}

export const STANDARD_2026_RULESET: BattleRuleset = {
  id: 'standard-2026',
  name: 'Standard 2026',
  deckSize: 60,
  initialHandSize: 7,
  prizeCount: 6,
  maxBenchSize: 5,
  firstTurn: {
    drawCard: false, // In current official rules, going first player does not draw a card at start of turn 1
    canAttack: false, // Going first player cannot attack on turn 1
    canPlaySupporter: true,
    canEvolve: false,
  },
  manualEnergyAttachmentsPerTurn: 1,
};
