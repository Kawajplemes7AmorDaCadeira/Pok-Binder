/**
 * BattleBot.ts - Automated bot player utilizing PlayerView and LegalActionGenerator.
 */

import { GameState } from '../engine/GameState';
import { PlayerId } from '../engine/GamePhase';
import { GameAction } from '../engine/GameAction';
import { LegalActionGenerator } from '../engine/LegalActionGenerator';
import { PlayerView } from '../engine/PlayerView';

export class BattleBot {
  public static selectAction(state: GameState, botPlayerId: PlayerId): GameAction | null {
    // Ensure bot only sees sanitized player view for privacy
    const sanitizedView = PlayerView.createPlayerView(state, botPlayerId);
    if (sanitizedView.activePlayerId !== botPlayerId) {
      return null;
    }

    const legalActions = LegalActionGenerator.getLegalActions(state, botPlayerId);
    if (legalActions.length === 0) {
      return null;
    }

    // Heuristic bot logic:
    // 1. If setup active pokemon needed, pick first basic in hand
    const setActive = legalActions.find((a) => a.action.type === 'SET_ACTIVE_POKEMON');
    if (setActive) return setActive.action;

    // 2. If confirm setup, do it
    const confirmSetup = legalActions.find((a) => a.action.type === 'CONFIRM_SETUP');
    if (confirmSetup) return confirmSetup.action;

    // 3. Play basic pokemon to bench if available
    const playBasic = legalActions.find((a) => a.action.type === 'PLAY_BASIC_POKEMON');
    if (playBasic) return playBasic.action;

    // 4. Attach energy if available
    const attachEnergy = legalActions.find((a) => a.action.type === 'ATTACH_ENERGY');
    if (attachEnergy) return attachEnergy.action;

    // 5. Attack if available
    const attack = legalActions.find((a) => a.action.type === 'ATTACK');
    if (attack) return attack.action;

    // 6. End turn as default fallback
    const endTurn = legalActions.find((a) => a.action.type === 'END_TURN');
    if (endTurn) return endTurn.action;

    // Fallback to first legal action
    return legalActions[0].action;
  }
}
