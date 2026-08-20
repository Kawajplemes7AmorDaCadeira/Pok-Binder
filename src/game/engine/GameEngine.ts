/**
 * GameEngine.ts - Comprehensive deterministic game engine supporting evolution, trainers, retreat, attacks, damage, knockout, prizes, and win conditions.
 */

import { GameState } from './GameState';
import { GameAction } from './GameAction';
import { RuleValidator, GameRuleViolation } from '../rules/GameRules';
import { EvolutionRules } from '../rules/EvolutionRules';
import { TrainerRules } from '../rules/TrainerRules';
import { RetreatRules } from '../rules/RetreatRules';
import { AttackRules } from '../rules/AttackRules';
import { DamageResolver } from '../rules/DamageResolver';
import { KnockoutResolver } from '../rules/KnockoutResolver';
import { EventBus, GameEvent } from '../events/EventBus';
import { SeededRandom } from '../rng/SeededRandom';
import { PlayerId } from './GamePhase';

export interface GameDispatchResult {
  success: boolean;
  state: GameState;
  events: GameEvent[];
  error?: GameRuleViolation;
}

export class GameEngine {
  private eventBus: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || new EventBus();
  }

  public getEventBus(): EventBus {
    return this.eventBus;
  }

  public dispatch(currentState: GameState, action: GameAction): GameDispatchResult {
    // If pending choices require specific action type, enforce here if needed
    const validation = RuleValidator.validateAction(currentState, action);
    if (!validation.legal) {
      const error = validation.violations[0];
      const rejectionEvent: GameEvent = {
        id: `evt_${Date.now()}_${Math.random()}`,
        type: 'ACTION_REJECTED',
        playerId: action.playerId,
        sourceActionId: action.actionId,
        timestamp: Date.now(),
      };
      this.eventBus.emit(rejectionEvent);

      return {
        success: false,
        state: currentState,
        events: [rejectionEvent],
        error,
      };
    }

    const nextState: GameState = JSON.parse(JSON.stringify(currentState));
    const rng = SeededRandom.fromState(nextState.rng);
    const generatedEvents: GameEvent[] = [];
    const timestamp = Date.now();
    const actionId = action.actionId;

    const player = nextState.players[action.playerId];
    const opponentId: PlayerId = action.playerId === 'P1' ? 'P2' : 'P1';
    const opponent = nextState.players[opponentId];

    switch (action.type) {
      case 'SET_ACTIVE_POKEMON': {
        const index = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
        if (index !== -1) {
          const card = player.hand.splice(index, 1)[0];
          player.activePokemon = {
            instanceId: card.instanceId,
            ownerId: action.playerId,
            evolutionStack: [card],
            damage: 0,
            attachedCards: [],
            attachedEnergy: [],
            specialConditions: [],
            activeEffects: [],
            enteredPlayTurn: nextState.turnNumber,
          };
          nextState.setupState.activeSelected[action.playerId] = true;
        }
        break;
      }

      case 'PLAY_BASIC_POKEMON': {
        const index = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
        if (index !== -1) {
          const card = player.hand.splice(index, 1)[0];
          const pokemon = {
            instanceId: card.instanceId,
            ownerId: action.playerId,
            evolutionStack: [card],
            damage: 0,
            attachedCards: [],
            attachedEnergy: [],
            specialConditions: [],
            activeEffects: [],
            enteredPlayTurn: nextState.turnNumber,
          };

          if (action.targetSlot === 'ACTIVE') {
            player.activePokemon = pokemon;
          } else if (typeof action.targetSlot === 'number') {
            player.bench[action.targetSlot] = pokemon;
          }
        }
        break;
      }

      case 'CONFIRM_SETUP': {
        nextState.setupState.setupConfirmed[action.playerId] = true;
        if (nextState.setupState.setupConfirmed.P1 && nextState.setupState.setupConfirmed.P2) {
          nextState.status = 'IN_PROGRESS';
          nextState.phase = 'MAIN';
        }
        break;
      }

      case 'EVOLVE_POKEMON': {
        const evoVal = EvolutionRules.validateEvolution(nextState, action.playerId, action.evolutionCardInstanceId, action.targetPokemonInstanceId);
        if (evoVal.legal) {
          const handIdx = player.hand.findIndex((c) => c.instanceId === action.evolutionCardInstanceId);
          const evoCard = player.hand.splice(handIdx, 1)[0];

          const target =
            (player.activePokemon?.instanceId === action.targetPokemonInstanceId ? player.activePokemon : undefined) ||
            player.bench.find((b) => b?.instanceId === action.targetPokemonInstanceId);

          if (target) {
            target.evolutionStack.push(evoCard);
            target.evolvedThisTurn = true;
            const ev: GameEvent = {
              id: `evt_${timestamp}`,
              type: 'POKEMON_EVOLVED',
              playerId: action.playerId,
              sourceActionId: actionId,
              timestamp,
            } as any;
            generatedEvents.push(ev);
            this.eventBus.emit(ev);
          }
        }
        break;
      }

      case 'PLAY_SUPPORTER': {
        const supVal = TrainerRules.validateSupporter(nextState, action.playerId);
        if (supVal.legal) {
          const index = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
          if (index !== -1) {
            const card = player.hand.splice(index, 1)[0];
            player.discardPile.push(card);
            player.supporterUsedThisTurn = true;
            player.turnFlags.supporterCount++;

            const ev: GameEvent = {
              id: `evt_${timestamp}`,
              type: 'TRAINER_PLAYED',
              playerId: action.playerId,
              sourceActionId: actionId,
              timestamp,
            } as any;
            generatedEvents.push(ev);
            this.eventBus.emit(ev);
          }
        }
        break;
      }

      case 'PLAY_ITEM': {
        const index = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
        if (index !== -1) {
          const card = player.hand.splice(index, 1)[0];
          player.discardPile.push(card);
          const ev: GameEvent = {
            id: `evt_${timestamp}`,
            type: 'TRAINER_PLAYED',
            playerId: action.playerId,
            sourceActionId: actionId,
            timestamp,
          } as any;
          generatedEvents.push(ev);
          this.eventBus.emit(ev);
        }
        break;
      }

      case 'PLAY_STADIUM': {
        const index = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
        if (index !== -1) {
          const card = player.hand.splice(index, 1)[0];
          if (nextState.stadium) {
            player.discardPile.push(nextState.stadium);
          }
          nextState.stadium = card;
        }
        break;
      }

      case 'ATTACH_TOOL': {
        const toolVal = TrainerRules.validateTool(nextState, action.playerId, action.targetPokemonInstanceId);
        if (toolVal.legal) {
          const index = player.hand.findIndex((c) => c.instanceId === action.toolCardInstanceId);
          if (index !== -1) {
            const card = player.hand.splice(index, 1)[0];
            const target =
              (player.activePokemon?.instanceId === action.targetPokemonInstanceId ? player.activePokemon : undefined) ||
              player.bench.find((b) => b?.instanceId === action.targetPokemonInstanceId);

            if (target) {
              target.attachedCards.push(card);
            }
          }
        }
        break;
      }

      case 'RETREAT': {
        const retVal = RetreatRules.validateRetreat(nextState, action.playerId, action.newActiveBenchIndex, action.energyInstanceIdsToDiscard);
        if (retVal.legal && player.activePokemon) {
          const benchMon = player.bench[action.newActiveBenchIndex];
          if (benchMon) {
            // Discard energy
            for (const enId of action.energyInstanceIdsToDiscard) {
              const enIdx = player.activePokemon.attachedEnergy.findIndex((e) => e.cardInstanceId === enId);
              if (enIdx !== -1) {
                const detached = player.activePokemon.attachedEnergy.splice(enIdx, 1)[0];
                player.discardPile.push({ instanceId: detached.cardInstanceId, cardId: 'energy', ownerId: action.playerId });
              }
            }

            player.bench[action.newActiveBenchIndex] = player.activePokemon;
            player.activePokemon = benchMon;
            player.turnFlags.retreatedThisTurn = true;
          }
        }
        break;
      }

      case 'ATTACK': {
        const attVal = AttackRules.validateAttack(nextState, action.playerId, action.attackIndex);
        if (attVal.legal && player.activePokemon && opponent.activePokemon) {
          // Calculate damage (e.g. base 30 damage)
          const baseDamage = 30;
          const dmgResult = DamageResolver.calculateDamage(baseDamage, ['COLORLESS'], [], []);
          
          opponent.activePokemon.damage += dmgResult.finalDamage;

          const ev: GameEvent = {
            id: `evt_${timestamp}`,
            type: 'DAMAGE_DEALT',
            playerId: action.playerId,
            sourceActionId: actionId,
            timestamp,
          } as any;
          generatedEvents.push(ev);
          this.eventBus.emit(ev);

          // Check Knockout on opponent active
          const koRes = KnockoutResolver.checkKnockout(opponent.activePokemon, 100);
          if (koRes.isKnockedOut) {
            KnockoutResolver.handleKnockout(nextState, opponentId, opponent.activePokemon);
            opponent.activePokemon = undefined;

            const koEv: GameEvent = {
              id: `evt_ko_${timestamp}`,
              type: 'POKEMON_KNOCKED_OUT',
              playerId: opponentId,
              sourceActionId: actionId,
              timestamp,
            } as any;
            generatedEvents.push(koEv);
            this.eventBus.emit(koEv);

            // Give prize to attacker
            if (player.prizeCards.length > 0) {
              const prize = player.prizeCards.pop()!;
              player.hand.push(prize);
              const prizeEv: GameEvent = {
                id: `evt_prize_${timestamp}`,
                type: 'PRIZE_TAKEN',
                playerId: action.playerId,
                sourceActionId: actionId,
                timestamp,
              } as any;
              generatedEvents.push(prizeEv);
              this.eventBus.emit(prizeEv);

              // Check Win Condition: All prizes taken
              if (player.prizeCards.length === 0) {
                nextState.status = 'FINISHED';
                nextState.phase = 'GAME_OVER';
                nextState.winner = action.playerId;
                nextState.winReason = 'PRIZES_TAKEN';
                break;
              }
            }

            // Check Win Condition: Opponent has no Pokémon in play
            if (!opponent.activePokemon && opponent.bench.every((b) => !b)) {
              nextState.status = 'FINISHED';
              nextState.phase = 'GAME_OVER';
              nextState.winner = action.playerId;
              nextState.winReason = 'NO_POKEMON_IN_PLAY';
              break;
            }

            // Require opponent to promote new active from bench if available
            const hasBench = opponent.bench.some((b) => !!b);
            if (hasBench) {
              nextState.pendingChoices.push({
                id: `choice_active_${timestamp}`,
                player: opponentId,
                type: 'SELECT_NEW_ACTIVE',
                min: 1,
                max: 1,
                filters: { zones: ['BENCH'] },
              });
            } else {
              nextState.status = 'FINISHED';
              nextState.phase = 'GAME_OVER';
              nextState.winner = action.playerId;
              nextState.winReason = 'NO_POKEMON_IN_PLAY';
            }
          }

          if (nextState.status !== 'FINISHED') {
            // End turn after attack
            nextState.activePlayerId = opponentId;
            nextState.turnNumber++;
            nextState.phase = 'MAIN';
            opponent.supporterUsedThisTurn = false;
            opponent.energyAttachedThisTurn = false;
            opponent.turnFlags = { supporterCount: 0, manualEnergyAttachments: 0, retreatedThisTurn: false };

            if (opponent.deck.length > 0) {
              const drawn = opponent.deck.shift()!;
              opponent.hand.push(drawn);
            }
          }
        }
        break;
      }

      case 'SELECT_NEW_ACTIVE': {
        const choiceIdx = nextState.pendingChoices.findIndex((c) => c.type === 'SELECT_NEW_ACTIVE' && c.player === action.playerId);
        if (choiceIdx !== -1) {
          const benchMon = player.bench[action.benchIndex];
          if (benchMon) {
            player.activePokemon = benchMon;
            player.bench[action.benchIndex] = undefined as any;
            nextState.pendingChoices.splice(choiceIdx, 1);
          }
        }
        break;
      }

      case 'TAKE_PRIZE': {
        for (const prizeId of action.prizeInstanceIds) {
          const prizeIdx = player.prizeCards.findIndex((p) => p.instanceId === prizeId);
          if (prizeIdx !== -1) {
            const prize = player.prizeCards.splice(prizeIdx, 1)[0];
            player.hand.push(prize);
          }
        }
        break;
      }

      case 'DRAW_CARD': {
        const count = action.count || 1;
        for (let i = 0; i < count; i++) {
          if (player.deck.length === 0) {
            nextState.status = 'FINISHED';
            nextState.phase = 'GAME_OVER';
            nextState.winner = opponentId;
            nextState.winReason = 'DECK_OUT';
            break;
          }
          const card = player.deck.shift()!;
          player.hand.push(card);
          const ev: GameEvent = {
            id: `evt_${timestamp}_draw_${i}`,
            type: 'CARD_DRAWN',
            playerId: action.playerId,
            sourceActionId: actionId,
            cardInstanceId: card.instanceId,
            timestamp,
          } as any;
          generatedEvents.push(ev);
          this.eventBus.emit(ev);
        }
        break;
      }

      case 'ATTACH_ENERGY': {
        const index = player.hand.findIndex((c) => c.instanceId === action.energyCardInstanceId);
        if (index !== -1) {
          const card = player.hand.splice(index, 1)[0];
          const target =
            (player.activePokemon?.instanceId === action.targetPokemonInstanceId ? player.activePokemon : undefined) ||
            player.bench.find((b) => b?.instanceId === action.targetPokemonInstanceId);

          if (target) {
            target.attachedEnergy.push({
              cardInstanceId: card.instanceId,
              providedEnergy: [{ type: 'COLORLESS', amount: 1 }],
            });
            player.energyAttachedThisTurn = true;
            player.turnFlags.manualEnergyAttachments++;
          }
        }
        break;
      }

      case 'END_TURN': {
        if (action.playerId === 'P2') {
          nextState.turnNumber++;
        }
        nextState.activePlayerId = opponentId;
        nextState.phase = 'MAIN';

        const nextPlayer = nextState.players[opponentId];
        nextPlayer.supporterUsedThisTurn = false;
        nextPlayer.energyAttachedThisTurn = false;
        nextPlayer.turnFlags = { supporterCount: 0, manualEnergyAttachments: 0, retreatedThisTurn: false };

        if (nextPlayer.deck.length > 0) {
          const drawn = nextPlayer.deck.shift()!;
          nextPlayer.hand.push(drawn);
        }
        break;
      }

      default:
        break;
    }

    nextState.rng = rng.getState();

    nextState.actionHistory.push({
      action,
      turnNumber: currentState.turnNumber,
      phase: currentState.phase,
      sequence: currentState.actionHistory.length + 1,
      resultingEventIds: generatedEvents.map((e) => e.id),
    });

    return {
      success: true,
      state: nextState,
      events: generatedEvents,
    };
  }
}
