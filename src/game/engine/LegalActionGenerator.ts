/**
 * LegalActionGenerator.ts - Generates legal actions available to a player based on current GameState.
 */

import { GameState } from './GameState';
import { PlayerId } from './GamePhase';
import { GameAction } from './GameAction';

export interface LegalActionOption {
  action: GameAction;
  label: string;
  category: 'HAND' | 'ACTIVE' | 'BENCH' | 'GLOBAL';
}

export class LegalActionGenerator {
  public static getLegalActions(state: GameState, playerId: PlayerId): LegalActionOption[] {
    const actions: LegalActionOption[] = [];
    const player = state.players[playerId];
    if (!player) return actions;

    // If game is in SETUP status
    if (state.status === 'SETUP') {
      if (!player.activePokemon) {
        // Can set active pokemon from hand
        for (const card of player.hand) {
          if (card.cardId.includes('basic') || card.cardId.includes('pokemon')) {
            actions.push({
              action: {
                actionId: `act_${Date.now()}_${Math.random()}`,
                type: 'SET_ACTIVE_POKEMON',
                playerId,
                cardInstanceId: card.instanceId,
              },
              label: `Definir Ativo: ${card.cardId}`,
              category: 'HAND',
            });
          }
        }
      } else if (!state.setupState.setupConfirmed[playerId]) {
        // Can confirm setup
        actions.push({
          action: {
            actionId: `act_${Date.now()}_${Math.random()}`,
            type: 'CONFIRM_SETUP',
            playerId,
          },
          label: 'Confirmar Setup',
          category: 'GLOBAL',
        });
      }
      return actions;
    }

    // If game is finished, no legal actions
    if (state.status === 'FINISHED') {
      return actions;
    }

    // If it's not player's turn
    if (state.activePlayerId !== playerId) {
      return actions;
    }

    // Main Phase actions
    if (state.phase === 'MAIN') {
      // 1. Play Basic Pokémon to Bench
      if (player.bench.some((b) => !b)) {
        for (const card of player.hand) {
          if (card.cardId.includes('basic') || card.cardId.includes('pokemon')) {
            const emptyIndex = player.bench.findIndex((b) => !b);
            if (emptyIndex !== -1) {
              actions.push({
                action: {
                  actionId: `act_${Date.now()}_${Math.random()}`,
                  type: 'PLAY_BASIC_POKEMON',
                  playerId,
                  cardInstanceId: card.instanceId,
                  targetSlot: emptyIndex,
                },
                label: `Jogar no Banco: ${card.cardId}`,
                category: 'HAND',
              });
            }
          }
        }
      }

      // 2. Attach Energy
      if (!player.energyAttachedThisTurn) {
        const energyCard = player.hand.find((c) => c.cardId.includes('energy'));
        if (energyCard && player.activePokemon) {
          actions.push({
            action: {
              actionId: `act_${Date.now()}_${Math.random()}`,
              type: 'ATTACH_ENERGY',
              playerId,
              energyCardInstanceId: energyCard.instanceId,
              targetPokemonInstanceId: player.activePokemon.instanceId,
            },
            label: 'Ligar Energia ao Ativo',
            category: 'HAND',
          });
        }
      }

      // 3. Evolve Pokémon
      if (state.turnNumber > 1) {
        for (const card of player.hand) {
          if (card.cardId.includes('stage') || card.cardId.includes('evolve') || card.cardId.includes('charmeleon')) {
            if (player.activePokemon && !player.activePokemon.evolvedThisTurn) {
              actions.push({
                action: {
                  actionId: `act_${Date.now()}_${Math.random()}`,
                  type: 'EVOLVE_POKEMON',
                  playerId,
                  evolutionCardInstanceId: card.instanceId,
                  targetPokemonInstanceId: player.activePokemon.instanceId,
                },
                label: `Evoluir Ativo com ${card.cardId}`,
                category: 'HAND',
              });
            }
          }
        }
      }

      // 4. Play Supporters / Items / Trainers
      for (const card of player.hand) {
        if (card.cardId.includes('trainer') || card.cardId.includes('item')) {
          actions.push({
            action: {
              actionId: `act_${Date.now()}_${Math.random()}`,
              type: 'PLAY_ITEM',
              playerId,
              cardInstanceId: card.instanceId,
            },
            label: `Jogar Item: ${card.cardId}`,
            category: 'HAND',
          });
        } else if (card.cardId.includes('supporter') && !player.supporterUsedThisTurn) {
          actions.push({
            action: {
              actionId: `act_${Date.now()}_${Math.random()}`,
              type: 'PLAY_SUPPORTER',
              playerId,
              cardInstanceId: card.instanceId,
            },
            label: `Jogar Supporter: ${card.cardId}`,
            category: 'HAND',
          });
        }
      }

      // 5. Attack with Active
      if (player.activePokemon && state.turnNumber > 1) {
        actions.push({
          action: {
            actionId: `act_${Date.now()}_${Math.random()}`,
            type: 'ATTACK',
            playerId,
            attackIndex: 0,
          },
          label: 'Atacar (30 Dano)',
          category: 'ACTIVE',
        });
      }

      // 6. End Turn
      actions.push({
        action: {
          actionId: `act_${Date.now()}_${Math.random()}`,
          type: 'END_TURN',
          playerId,
        },
        label: 'Encerrar Turno',
        category: 'GLOBAL',
      });
    }

    return actions;
  }
}
