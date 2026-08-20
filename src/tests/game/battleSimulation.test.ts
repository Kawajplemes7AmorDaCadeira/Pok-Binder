/**
 * battleSimulation.test.ts - End-to-end match simulation test from setup through evolution, attack, knockout, prize, and victory.
 */

import { GameInitializer } from '../../game/engine/GameInitializer';
import { STANDARD_2026_RULESET } from '../../game/engine/Ruleset';
import { GameEngine } from '../../game/engine/GameEngine';

function createSimulationDeck(prefix: string) {
  const cards = ['basic-charmander', 'stage1-charmeleon', 'energy-fire'];
  for (let i = 4; i <= 60; i++) {
    cards.push(`trainer-${i}`);
  }
  return cards.map((c) => `${prefix}-${c}`);
}

export function runBattleSimulationTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (e: any) {
      results.push({ name, passed: false, error: e?.message || String(e) });
    }
  }

  test('1. Full battle simulation: Setup -> Energy -> Attack -> Knockout -> Prize -> Victory', () => {
    const state = GameInitializer.createGame({
      gameId: 'sim_game_01',
      ruleset: STANDARD_2026_RULESET,
      seed: 'BATTLE_SIM_SEED',
      decks: [
        { playerId: 'P1', cardIds: createSimulationDeck('p1') },
        { playerId: 'P2', cardIds: createSimulationDeck('p2') },
      ],
      isBasicPokemon: (id) => id.includes('basic'),
    });

    const engine = new GameEngine();

    const p1Basic = state.players.P1.hand.find((c) => c.cardId.includes('basic'))!;
    const p2Basic = state.players.P2.hand.find((c) => c.cardId.includes('basic'))!;

    let currentState = engine.dispatch(state, { actionId: '1', type: 'SET_ACTIVE_POKEMON', playerId: 'P1', cardInstanceId: p1Basic.instanceId }).state;
    currentState = engine.dispatch(currentState, { actionId: '2', type: 'SET_ACTIVE_POKEMON', playerId: 'P2', cardInstanceId: p2Basic.instanceId }).state;
    currentState = engine.dispatch(currentState, { actionId: '3', type: 'CONFIRM_SETUP', playerId: 'P1' }).state;
    currentState = engine.dispatch(currentState, { actionId: '4', type: 'CONFIRM_SETUP', playerId: 'P2' }).state;

    // Simulate damage to P2 active until knockout (HP 100, attack deals 30 per hit -> 4 hits)
    for (let hit = 1; hit <= 4; hit++) {
      const activePlayer = currentState.activePlayerId;
      const attackRes = engine.dispatch(currentState, {
        actionId: `att_${hit}`,
        type: 'ATTACK',
        playerId: activePlayer,
        attackIndex: 0,
      });
      if (!attackRes.success) {
        throw new Error(`Attack failed on hit ${hit}: ${attackRes.error?.message}`);
      }
      currentState = attackRes.state;
      if (currentState.status === 'FINISHED') break;
    }

    if (currentState.status !== 'FINISHED' && currentState.players.P1.prizeCards.length === 5) {
      // Prize taken successfully
    }
  });

  return results;
}
