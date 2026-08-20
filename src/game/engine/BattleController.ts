/**
 * BattleController.ts - Controller wrapping GameEngine, state, persistence, and bot execution.
 */

import { GameState } from './GameState';
import { GameAction } from './GameAction';
import { GameEngine, GameDispatchResult } from './GameEngine';
import { PlayerId } from './GamePhase';
import { PlayerView, SanitizedGameView } from './PlayerView';
import { BattleBot } from '../bot/BattleBot';
import { GameInitializer } from './GameInitializer';
import { STANDARD_2026_RULESET } from './Ruleset';

export class BattleController {
  private state: GameState;
  private engine: GameEngine;
  private onStateChange?: (state: GameState) => void;
  private botMode: 'EASY' | 'NORMAL' | 'NONE';

  constructor(initialState: GameState, botMode: 'EASY' | 'NORMAL' | 'NONE' = 'EASY', onStateChange?: (state: GameState) => void) {
    this.state = initialState;
    this.engine = new GameEngine();
    this.botMode = botMode;
    this.onStateChange = onStateChange;
  }

  public getState(): GameState {
    return this.state;
  }

  public getPlayerView(playerId: PlayerId): SanitizedGameView {
    return PlayerView.createPlayerView(this.state, playerId);
  }

  public dispatch(action: GameAction): GameDispatchResult {
    const result = this.engine.dispatch(this.state, action);
    if (result.success) {
      this.state = result.state;
      this.saveToLocalStorage();
      if (this.onStateChange) {
        this.onStateChange(this.state);
      }

      // If playing against bot and it's bot's turn, trigger bot action after delay
      if (this.botMode !== 'NONE' && this.state.activePlayerId === 'P2' && this.state.status !== 'FINISHED') {
        setTimeout(() => {
          this.triggerBotTurn();
        }, 500);
      }
    }
    return result;
  }

  public triggerBotTurn(): void {
    if (this.state.status === 'FINISHED' || this.state.activePlayerId !== 'P2') return;

    const botAction = BattleBot.selectAction(this.state, 'P2');
    if (botAction) {
      this.dispatch(botAction);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('pokebinder_battle_save', JSON.stringify(this.state));
    } catch (e) {
      // ignore quota errors
    }
  }

  public static loadFromLocalStorage(): GameState | null {
    try {
      const saved = localStorage.getItem('pokebinder_battle_save');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  public static createNewGame(deckP1: string[], deckP2: string[], botMode: 'EASY' | 'NORMAL' | 'NONE' = 'EASY'): BattleController {
    const state = GameInitializer.createGame({
      gameId: `game_${Date.now()}`,
      ruleset: STANDARD_2026_RULESET,
      seed: `SEED_${Date.now()}`,
      decks: [
        { playerId: 'P1', cardIds: deckP1 },
        { playerId: 'P2', cardIds: deckP2 },
      ],
      isBasicPokemon: (id) => id.includes('basic') || id.includes('charmander') || id.includes('pikachu'),
    });
    return new BattleController(state, botMode);
  }
}
