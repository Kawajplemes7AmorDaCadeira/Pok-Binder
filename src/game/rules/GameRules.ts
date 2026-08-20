/**
 * GameRules.ts - Rule validator ensuring strict deterministic legality checks.
 */

import { GameState } from '../engine/GameState';
import { GameAction } from '../engine/GameAction';
import { PlayerId } from '../engine/GamePhase';

export type GameRuleViolationCode =
  | 'NOT_YOUR_TURN'
  | 'INVALID_PHASE'
  | 'CARD_NOT_IN_HAND'
  | 'INVALID_TARGET'
  | 'ENERGY_LIMIT_REACHED'
  | 'SUPPORTER_ALREADY_USED'
  | 'BENCH_FULL'
  | 'ACTIVE_ALREADY_SET'
  | 'NOT_A_BASIC_POKEMON'
  | 'ACTION_NOT_IMPLEMENTED'
  | 'GAME_ALREADY_FINISHED';

export interface GameRuleViolation {
  code: GameRuleViolationCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface RuleValidationResult {
  legal: boolean;
  violations: GameRuleViolation[];
}

export class RuleValidator {
  public static validateAction(state: GameState, action: GameAction): RuleValidationResult {
    const violations: GameRuleViolation[] = [];

    if (state.status === 'FINISHED') {
      violations.push({
        code: 'GAME_ALREADY_FINISHED',
        message: 'The game has already ended.',
      });
      return { legal: false, violations };
    }

    const player = state.players[action.playerId];
    if (!player) {
      violations.push({
        code: 'INVALID_TARGET',
        message: 'Player state not found.',
      });
      return { legal: false, violations };
    }

    // Setup phase rules
    if (state.phase === 'SETUP_BASIC') {
      if (action.type === 'SET_ACTIVE_POKEMON') {
        if (player.activePokemon) {
          violations.push({
            code: 'ACTIVE_ALREADY_SET',
            message: 'Active Pokémon is already set for this player.',
          });
        }
        const card = player.hand.find((c) => c.instanceId === action.cardInstanceId);
        if (!card) {
          violations.push({
            code: 'CARD_NOT_IN_HAND',
            message: 'Card instance not found in hand.',
          });
        } else {
          const isBasic = card.cardId.includes('basic') || card.cardId.includes('básico') || !card.cardId.includes('stage');
          if (!isBasic) {
            violations.push({
              code: 'NOT_A_BASIC_POKEMON',
              message: 'Selected card is not a Basic Pokémon.',
            });
          }
        }
        return { legal: violations.length === 0, violations };
      }

      if (action.type === 'PLAY_BASIC_POKEMON') {
        const card = player.hand.find((c) => c.instanceId === action.cardInstanceId);
        if (!card) {
          violations.push({
            code: 'CARD_NOT_IN_HAND',
            message: 'Card instance not found in hand.',
          });
        } else {
          const isBasic = card.cardId.includes('basic') || card.cardId.includes('básico') || !card.cardId.includes('stage');
          if (!isBasic) {
            violations.push({
              code: 'NOT_A_BASIC_POKEMON',
              message: 'Selected card is not a Basic Pokémon.',
            });
          }
        }
        if (typeof action.targetSlot === 'number') {
          if (action.targetSlot < 0 || action.targetSlot >= 5) {
            violations.push({
              code: 'INVALID_TARGET',
              message: 'Invalid bench slot.',
            });
          } else if (player.bench[action.targetSlot]) {
            violations.push({
              code: 'BENCH_FULL',
              message: 'Bench slot is already occupied.',
            });
          }
        }
        return { legal: violations.length === 0, violations };
      }

      if (action.type === 'CONFIRM_SETUP') {
        if (!player.activePokemon) {
          violations.push({
            code: 'INVALID_TARGET',
            message: 'Must set an Active Pokémon before confirming setup.',
          });
        }
        return { legal: violations.length === 0, violations };
      }
    }

    // Standard Turn Rules
    if (action.type !== 'SET_ACTIVE_POKEMON' && action.type !== 'PLAY_BASIC_POKEMON' && action.type !== 'CONFIRM_SETUP') {
      if (action.playerId !== state.activePlayerId) {
        violations.push({
          code: 'NOT_YOUR_TURN',
          message: 'It is not this player turn.',
        });
      }
    }

    switch (action.type) {
      case 'DRAW_CARD':
        break;

      case 'PLAY_BASIC_POKEMON': {
        if (state.phase !== 'MAIN') {
          violations.push({
            code: 'INVALID_PHASE',
            message: 'Can only play Pokémon during Main Phase.',
          });
        }
        const card = player.hand.find((c) => c.instanceId === action.cardInstanceId);
        if (!card) {
          violations.push({
            code: 'CARD_NOT_IN_HAND',
            message: 'Card not found in hand.',
          });
        } else {
          const isBasic = card.cardId.includes('basic') || card.cardId.includes('básico') || !card.cardId.includes('stage');
          if (!isBasic) {
            violations.push({
              code: 'NOT_A_BASIC_POKEMON',
              message: 'Card is not a Basic Pokémon.',
            });
          }
        }
        if (typeof action.targetSlot === 'number') {
          if (action.targetSlot < 0 || action.targetSlot >= 5 || player.bench[action.targetSlot]) {
            violations.push({
              code: 'BENCH_FULL',
              message: 'Bench slot invalid or occupied.',
            });
          }
        }
        break;
      }

      case 'ATTACH_ENERGY': {
        if (state.phase !== 'MAIN') {
          violations.push({
            code: 'INVALID_PHASE',
            message: 'Energy can only be attached during Main Phase.',
          });
        }
        if (player.energyAttachedThisTurn) {
          violations.push({
            code: 'ENERGY_LIMIT_REACHED',
            message: 'Already attached energy this turn.',
          });
        }
        const card = player.hand.find((c) => c.instanceId === action.energyCardInstanceId);
        if (!card) {
          violations.push({
            code: 'CARD_NOT_IN_HAND',
            message: 'Energy card not in hand.',
          });
        }
        const target =
          (player.activePokemon?.instanceId === action.targetPokemonInstanceId ? player.activePokemon : undefined) ||
          player.bench.find((b) => b?.instanceId === action.targetPokemonInstanceId);

        if (!target) {
          violations.push({
            code: 'INVALID_TARGET',
            message: 'Target Pokémon not in play.',
          });
        }
        break;
      }

      case 'END_TURN':
        if (state.phase !== 'MAIN') {
          violations.push({
            code: 'INVALID_PHASE',
            message: 'Can only end turn during Main Phase.',
          });
        }
        break;

      default:
        break;
    }

    return {
      legal: violations.length === 0,
      violations,
    };
  }

  /**
   * Card Conservation Test: Ensures total card instances across all zones remains constant.
   */
  public static validateCardConservation(state: GameState, initialTotalCards: number): boolean {
    let currentTotal = 0;
    for (const pid of ['P1', 'P2'] as PlayerId[]) {
      const p = state.players[pid];
      currentTotal += p.deck.length + p.hand.length + p.discardPile.length + p.prizeCards.length;
      if (p.activePokemon) {
        currentTotal += p.activePokemon.evolutionStack.length + p.activePokemon.attachedCards.length + p.activePokemon.attachedEnergy.length;
      }
      for (const b of p.bench) {
        if (b) {
          currentTotal += b.evolutionStack.length + b.attachedCards.length + b.attachedEnergy.length;
        }
      }
    }
    return currentTotal === initialTotalCards;
  }

  public static validateGameStateIntegrity(state: GameState): boolean {
    const allInstanceIds = new Set<string>();

    for (const pid of ['P1', 'P2'] as PlayerId[]) {
      const p = state.players[pid];
      if (!p) return false;

      const checkCards = (cards: any[]) => {
        for (const c of cards) {
          if (!c || !c.instanceId || !c.cardId) return false;
          if (allInstanceIds.has(c.instanceId)) return false;
          allInstanceIds.add(c.instanceId);
        }
      };

      checkCards(p.deck);
      checkCards(p.hand);
      checkCards(p.discardPile);
      checkCards(p.prizeCards);

      if (p.activePokemon) {
        if (allInstanceIds.has(p.activePokemon.instanceId)) return false;
        allInstanceIds.add(p.activePokemon.instanceId);
        checkCards(p.activePokemon.evolutionStack);
        checkCards(p.activePokemon.attachedCards);
        checkCards(p.activePokemon.attachedEnergy.map((e: any) => ({ instanceId: e.cardInstanceId, cardId: 'energy' })));
      }

      for (const b of p.bench) {
        if (b) {
          if (allInstanceIds.has(b.instanceId)) return false;
          allInstanceIds.add(b.instanceId);
          checkCards(b.evolutionStack);
          checkCards(b.attachedCards);
          checkCards(b.attachedEnergy.map((e: any) => ({ instanceId: e.cardInstanceId, cardId: 'energy' })));
        }
      }
    }

    return true;
  }
}
