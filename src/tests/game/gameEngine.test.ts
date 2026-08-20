/**
 * gameEngine.test.ts - Unit tests for the deterministic game engine foundation following project test convention.
 */

import { GameEngine } from '../../game/engine/GameEngine';
import { GameState, GAME_ENGINE_VERSION } from '../../game/engine/GameState';
import { SeededRandom } from '../../game/rng/SeededRandom';
import { RuleValidator } from '../../game/rules/GameRules';
import { GameAction } from '../../game/engine/GameAction';

function createTestInitialState(seed = 'TEST_SEED_123'): GameState {
  const rng = new SeededRandom(seed);
  return {
    gameId: 'game_test_01',
    engineVersion: GAME_ENGINE_VERSION,
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
          { instanceId: 'p1_card_1', cardId: 'sv1-01', ownerId: 'P1' },
          { instanceId: 'p1_card_2', cardId: 'sv1-02', ownerId: 'P1' },
          { instanceId: 'p1_card_3', cardId: 'sv1-03', ownerId: 'P1' },
        ],
        hand: [
          { instanceId: 'p1_card_4', cardId: 'sv1-basic', ownerId: 'P1' },
          { instanceId: 'p1_card_5', cardId: 'sv1-energy', ownerId: 'P1' },
        ],
        discardPile: [],
        prizeCards: [],
        bench: [undefined as any, undefined as any, undefined as any, undefined as any, undefined as any],
        supporterUsedThisTurn: false,
        energyAttachedThisTurn: false,
        turnFlags: { supporterCount: 0, manualEnergyAttachments: 0, retreatedThisTurn: false },
        effects: [],
      },
      P2: {
        id: 'P2',
        deck: [{ instanceId: 'p2_card_1', cardId: 'sv1-01', ownerId: 'P2' }],
        hand: [],
        discardPile: [],
        prizeCards: [],
        bench: [undefined as any, undefined as any, undefined as any, undefined as any, undefined as any],
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

export function runGameEngineTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e?.message || String(e) });
    }
  }

  test('1. Engine creation and initial state verification', () => {
    const state = createTestInitialState();
    if (state.gameId !== 'game_test_01') throw new Error(`Expected gameId game_test_01, got ${state.gameId}`);
    if (state.engineVersion !== GAME_ENGINE_VERSION) throw new Error(`Expected engine version ${GAME_ENGINE_VERSION}`);
    if (!state.players.P1 || !state.players.P2) throw new Error('Players P1 or P2 missing');
    if (state.phase !== 'MAIN') throw new Error(`Expected phase MAIN, got ${state.phase}`);
  });

  test('2. Card instance uniqueness across decks', () => {
    const state = createTestInitialState();
    const allIds = [
      ...state.players.P1.deck.map((c) => c.instanceId),
      ...state.players.P1.hand.map((c) => c.instanceId),
    ];
    const uniqueIds = new Set(allIds);
    if (uniqueIds.size !== allIds.length) throw new Error('Duplicate card instance IDs found');
  });

  test('3. Action rejection on illegal moves (not your turn)', () => {
    const engine = new GameEngine();
    const state = createTestInitialState();

    const illegalAction: GameAction = {
      actionId: 'act_1',
      type: 'DRAW_CARD',
      playerId: 'P2',
    };

    const result = engine.dispatch(state, illegalAction);
    if (result.success) throw new Error('Illegal action was incorrectly allowed');
    if (result.error?.code !== 'NOT_YOUR_TURN') throw new Error(`Expected NOT_YOUR_TURN, got ${result.error?.code}`);
  });

  test('4. Event emission on valid action (draw card)', () => {
    const engine = new GameEngine();
    const state = createTestInitialState();
    const events: any[] = [];
    engine.getEventBus().subscribe((e) => events.push(e));

    const validAction: GameAction = {
      actionId: 'act_2',
      type: 'DRAW_CARD',
      playerId: 'P1',
      count: 1,
    };

    const result = engine.dispatch(state, validAction);
    if (!result.success) throw new Error('Valid action failed');
    if (result.state.players.P1.hand.length !== 3) throw new Error(`Expected hand size 3, got ${result.state.players.P1.hand.length}`);
    if (!events.some((e) => e.type === 'CARD_DRAWN')) throw new Error('CARD_DRAWN event not emitted');
  });

  test('5. Determinism test (same seed + actions = identical state)', () => {
    const runSimulation = () => {
      const engine = new GameEngine();
      let state = createTestInitialState('DETERMINISTIC_SEED');
      
      const actions: GameAction[] = [
        { actionId: 'a1', type: 'DRAW_CARD', playerId: 'P1', count: 1 },
        { actionId: 'a2', type: 'ATTACH_ENERGY', playerId: 'P1', energyCardInstanceId: 'p1_card_5', targetPokemonInstanceId: 'p1_card_4' },
        { actionId: 'a3', type: 'END_TURN', playerId: 'P1' },
      ];

      for (const act of actions) {
        const res = engine.dispatch(state, act);
        if (res.success) {
          state = res.state;
        }
      }
      return state;
    };

    const result1 = runSimulation();
    const result2 = runSimulation();

    if (JSON.stringify(result1) !== JSON.stringify(result2)) {
      throw new Error('Deterministic simulation yielded different states for same seed and actions');
    }
  });

  test('6. State integrity validator', () => {
    const state = createTestInitialState();
    if (!RuleValidator.validateGameStateIntegrity(state)) {
      throw new Error('Valid initial state failed integrity check');
    }
  });

  test('7. Serialization roundtrip', () => {
    const state = createTestInitialState();
    const serialized = JSON.stringify(state);
    const deserialized: GameState = JSON.parse(serialized);
    if (JSON.stringify(deserialized) !== JSON.stringify(state)) {
      throw new Error('Serialization roundtrip produced differing state');
    }
  });

  return results;
}
