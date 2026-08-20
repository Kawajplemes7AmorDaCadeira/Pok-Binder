/**
 * setupAndTurn.test.ts - Unit tests for Game Setup, Mulligan, Turn Cycle, PlayerView, and Card Conservation.
 */

import { GameInitializer } from '../../game/engine/GameInitializer';
import { STANDARD_2026_RULESET } from '../../game/engine/Ruleset';
import { GameEngine } from '../../game/engine/GameEngine';
import { PlayerView } from '../../game/engine/PlayerView';
import { RuleValidator } from '../../game/rules/GameRules';

function createMockDeck(prefix: string) {
  const cards = ['basic-pikachu', 'energy-fire'];
  for (let i = 3; i <= 60; i++) {
    cards.push(`trainer-${i}`);
  }
  return cards.map((c) => `${prefix}-${c}`);
}

export function runSetupAndTurnTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e?.message || String(e) });
    }
  }

  test('1. Game initialization with setup, hand draw, and prizes', () => {
    const state = GameInitializer.createGame({
      gameId: 'test_game_setup',
      ruleset: STANDARD_2026_RULESET,
      seed: 'SETUP_TEST_SEED',
      decks: [
        { playerId: 'P1', cardIds: createMockDeck('p1') },
        { playerId: 'P2', cardIds: createMockDeck('p2') },
      ],
      isBasicPokemon: (id) => id.includes('basic'),
    });

    if (state.status !== 'SETUP') throw new Error(`Expected SETUP status, got ${state.status}`);
    if (state.players.P1.hand.length !== 7) throw new Error(`Expected initial hand size 7, got ${state.players.P1.hand.length}`);
    if (state.players.P1.prizeCards.length !== 6) throw new Error(`Expected 6 prize cards, got ${state.players.P1.prizeCards.length}`);
  });

  test('2. Setting active Pokémon and confirming setup', () => {
    const state = GameInitializer.createGame({
      gameId: 'test_game_setup_2',
      ruleset: STANDARD_2026_RULESET,
      seed: 'SETUP_TEST_SEED_2',
      decks: [
        { playerId: 'P1', cardIds: createMockDeck('p1') },
        { playerId: 'P2', cardIds: createMockDeck('p2') },
      ],
      isBasicPokemon: (id) => id.includes('basic'),
    });

    const engine = new GameEngine();

    const p1Basic = state.players.P1.hand.find((c) => c.cardId.includes('basic'));
    if (!p1Basic) throw new Error('No basic card found in P1 hand');

    const p2Basic = state.players.P2.hand.find((c) => c.cardId.includes('basic'));
    if (!p2Basic) throw new Error('No basic card found in P2 hand');

    const res1 = engine.dispatch(state, {
      actionId: 'act_s1',
      type: 'SET_ACTIVE_POKEMON',
      playerId: 'P1',
      cardInstanceId: p1Basic.instanceId,
    });
    if (!res1.success) throw new Error(`Failed to set P1 active: ${res1.error?.message}`);

    const res2 = engine.dispatch(res1.state, {
      actionId: 'act_s2',
      type: 'SET_ACTIVE_POKEMON',
      playerId: 'P2',
      cardInstanceId: p2Basic.instanceId,
    });
    if (!res2.success) throw new Error(`Failed to set P2 active: ${res2.error?.message}`);

    const res3 = engine.dispatch(res2.state, { actionId: 'act_c1', type: 'CONFIRM_SETUP', playerId: 'P1' });
    const res4 = engine.dispatch(res3.state, { actionId: 'act_c2', type: 'CONFIRM_SETUP', playerId: 'P2' });

    if (res4.state.status !== 'IN_PROGRESS') throw new Error(`Expected IN_PROGRESS status after setup confirmation, got ${res4.state.status}`);
  });

  test('3. Turn cycle, draw, energy attachment, and card conservation', () => {
    const state = GameInitializer.createGame({
      gameId: 'test_game_turn',
      ruleset: STANDARD_2026_RULESET,
      seed: 'TURN_TEST_SEED',
      decks: [
        { playerId: 'P1', cardIds: createMockDeck('p1') },
        { playerId: 'P2', cardIds: createMockDeck('p2') },
      ],
      isBasicPokemon: (id) => id.includes('basic'),
    });

    const engine = new GameEngine();
    const p1Basic = state.players.P1.hand.find((c) => c.cardId.includes('basic'))!;
    const p2Basic = state.players.P2.hand.find((c) => c.cardId.includes('basic'))!;
    const p1Energy = state.players.P1.hand.find((c) => c.cardId.includes('energy'))!;

    let currentState = engine.dispatch(state, { actionId: '1', type: 'SET_ACTIVE_POKEMON', playerId: 'P1', cardInstanceId: p1Basic.instanceId }).state;
    currentState = engine.dispatch(currentState, { actionId: '2', type: 'SET_ACTIVE_POKEMON', playerId: 'P2', cardInstanceId: p2Basic.instanceId }).state;
    currentState = engine.dispatch(currentState, { actionId: '3', type: 'CONFIRM_SETUP', playerId: 'P1' }).state;
    currentState = engine.dispatch(currentState, { actionId: '4', type: 'CONFIRM_SETUP', playerId: 'P2' }).state;

    const activePlayer = currentState.activePlayerId;
    let activePlayerEnergy = currentState.players[activePlayer].hand.find((c) => c.cardId.includes('energy'));
    if (!activePlayerEnergy) {
      const idx = currentState.players[activePlayer].deck.findIndex((c) => c.cardId.includes('energy'));
      if (idx !== -1) {
        activePlayerEnergy = currentState.players[activePlayer].deck.splice(idx, 1)[0];
        currentState.players[activePlayer].hand.push(activePlayerEnergy);
      }
    }

    const attachRes = engine.dispatch(currentState, {
      actionId: '5',
      type: 'ATTACH_ENERGY',
      playerId: activePlayer,
      energyCardInstanceId: activePlayerEnergy!.instanceId,
      targetPokemonInstanceId: currentState.players[activePlayer].activePokemon!.instanceId,
    });
    if (!attachRes.success) throw new Error(`Attach energy failed: ${attachRes.error?.message}`);

    const secondEnergy = attachRes.state.players[activePlayer].hand.find((c) => c.cardId.includes('energy'));
    if (secondEnergy) {
      const failAttach = engine.dispatch(attachRes.state, {
        actionId: '6',
        type: 'ATTACH_ENERGY',
        playerId: activePlayer,
        energyCardInstanceId: secondEnergy.instanceId,
        targetPokemonInstanceId: attachRes.state.players[activePlayer].activePokemon!.instanceId,
      });
      if (failAttach.success) throw new Error('Second energy attachment in same turn should have been rejected');
    }

    const endRes = engine.dispatch(attachRes.state, {
      actionId: '7',
      type: 'END_TURN',
      playerId: activePlayer,
    });
    if (!endRes.success) throw new Error(`End turn failed: ${endRes.error?.message}`);
    if (endRes.state.activePlayerId === activePlayer) throw new Error('Active player did not switch after end turn');

    if (!RuleValidator.validateCardConservation(endRes.state, 120)) {
      throw new Error('Card conservation test failed: total card instances changed during actions');
    }
  });

  test('4. PlayerView hidden information isolation', () => {
    const state = GameInitializer.createGame({
      gameId: 'test_game_view',
      ruleset: STANDARD_2026_RULESET,
      seed: 'VIEW_TEST_SEED',
      decks: [
        { playerId: 'P1', cardIds: createMockDeck('p1') },
        { playerId: 'P2', cardIds: createMockDeck('p2') },
      ],
      isBasicPokemon: (id) => id.includes('basic'),
    });

    const viewP1 = PlayerView.createPlayerView(state, 'P1');
    if (!viewP1.players.P1.hand) throw new Error('P1 cannot see their own hand');
    if (viewP1.players.P2.hand !== undefined) throw new Error('P1 can see P2 private hand cards');
    if (viewP1.players.P2.handCount !== 7) throw new Error(`Expected P2 handCount 7, got ${viewP1.players.P2.handCount}`);
  });

  return results;
}
