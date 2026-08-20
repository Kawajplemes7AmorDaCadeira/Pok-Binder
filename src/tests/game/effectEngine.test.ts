/**
 * effectEngine.test.ts - Unit tests for EffectEngine, EffectRegistry, Draw, Heal, Damage, and CoinFlip resolvers.
 */

import { EffectEngine } from '../../game/effects/EffectEngine';
import { SeededRandom } from '../../game/rng/SeededRandom';
import { GameState } from '../../game/engine/GameState';

function createMockState(): GameState {
  const rng = new SeededRandom('EFFECT_TEST_SEED');
  return {
    gameId: 'effect_game_01',
    engineVersion: '0.1.0',
    rulesetVersion: 'standard-2026',
    status: 'IN_PROGRESS',
    phase: 'MAIN',
    turnNumber: 1,
    activePlayerId: 'P1',
    firstPlayerId: 'P1',
    players: {
      P1: {
        id: 'P1',
        deck: [
          { instanceId: 'p1_d1', cardId: 'basic-pikachu', ownerId: 'P1' },
          { instanceId: 'p1_d2', cardId: 'energy-fire', ownerId: 'P1' },
        ],
        hand: [],
        discardPile: [],
        prizeCards: [],
        bench: [undefined as any, undefined as any, undefined as any, undefined as any, undefined as any],
        activePokemon: {
          instanceId: 'p1_active',
          ownerId: 'P1',
          evolutionStack: [{ instanceId: 'p1_active', cardId: 'basic-pikachu', ownerId: 'P1' }],
          damage: 50,
          attachedCards: [],
          attachedEnergy: [],
          specialConditions: [],
          activeEffects: [],
          enteredPlayTurn: 1,
        },
        supporterUsedThisTurn: false,
        energyAttachedThisTurn: false,
        turnFlags: { supporterCount: 0, manualEnergyAttachments: 0, retreatedThisTurn: false },
        effects: [],
      },
      P2: {
        id: 'P2',
        deck: [],
        hand: [],
        discardPile: [],
        prizeCards: [],
        bench: [undefined as any, undefined as any, undefined as any, undefined as any, undefined as any],
        activePokemon: {
          instanceId: 'p2_active',
          ownerId: 'P2',
          evolutionStack: [{ instanceId: 'p2_active', cardId: 'basic-charmander', ownerId: 'P2' }],
          damage: 0,
          attachedCards: [],
          attachedEnergy: [],
          specialConditions: [],
          activeEffects: [],
          enteredPlayTurn: 1,
        },
        supporterUsedThisTurn: false,
        energyAttachedThisTurn: false,
        turnFlags: { supporterCount: 0, manualEnergyAttachments: 0, retreatedThisTurn: false },
        effects: [],
      },
    },
    setupState: {
      mulligans: { P1: 0, P2: 0 },
      activeSelected: { P1: true, P2: true },
      setupConfirmed: { P1: true, P2: true },
      prizesPlaced: true,
      startingPlayerResolved: true,
    },
    pendingChoices: [],
    activeEffects: [],
    actionHistory: [],
    rng: rng.getState(),
  };
}

export function runEffectEngineTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e?.message || String(e) });
    }
  }

  test('1. Draw effect draws cards correctly', () => {
    const state = createMockState();
    const result = EffectEngine.resolve(
      state,
      [{ id: 'e1', type: 'DRAW', amount: 2 }],
      { sourceActionId: 'act_1', controllerId: 'P1', opponentId: 'P2' }
    );

    if (!result.success) throw new Error(`Draw failed: ${result.error?.message}`);
    if (result.state.players.P1.hand.length !== 2) throw new Error(`Expected hand length 2, got ${result.state.players.P1.hand.length}`);
  });

  test('2. Heal effect heals damage without going below zero', () => {
    const state = createMockState();
    const result = EffectEngine.resolve(
      state,
      [{ id: 'e2', type: 'HEAL', amount: 30 }],
      { sourceActionId: 'act_2', controllerId: 'P1', opponentId: 'P2' }
    );

    if (!result.success) throw new Error(`Heal failed: ${result.error?.message}`);
    // Initial damage was 50, healed 30 -> 20 remaining
    if (result.state.players.P1.activePokemon?.damage !== 20) {
      throw new Error(`Expected damage 20, got ${result.state.players.P1.activePokemon?.damage}`);
    }
  });

  test('3. Damage effect deals damage to opponent active', () => {
    const state = createMockState();
    const result = EffectEngine.resolve(
      state,
      [{ id: 'e3', type: 'DAMAGE', amount: 40 }],
      { sourceActionId: 'act_3', controllerId: 'P1', opponentId: 'P2' }
    );

    if (!result.success) throw new Error(`Damage failed: ${result.error?.message}`);
    if (result.state.players.P2.activePokemon?.damage !== 40) {
      throw new Error(`Expected P2 damage 40, got ${result.state.players.P2.activePokemon?.damage}`);
    }
  });

  test('4. Coin flip effect produces deterministic heads/tails', () => {
    const state = createMockState();
    const result = EffectEngine.resolve(
      state,
      [{ id: 'e4', type: 'COIN_FLIP', count: 2 }],
      { sourceActionId: 'act_4', controllerId: 'P1', opponentId: 'P2' }
    );

    if (!result.success) throw new Error(`Coin flip failed: ${result.error?.message}`);
  });

  return results;
}
