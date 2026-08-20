/**
 * PlayerView.ts - Generates limited view of the game state for a specific player (Hidden Information).
 */

import { GameState } from './GameState';
import { PlayerId } from './GamePhase';
import { CardInstance } from '../state/CardState';
import { PlayerState } from '../state/PlayerState';

export interface SanitizedPlayerView {
  id: PlayerId;
  handCount: number;
  hand?: CardInstance[];
  deckCount: number;
  discardPile: CardInstance[];
  prizeCount: number;
  prizeCards?: CardInstance[];
  activePokemon?: any;
  bench: any[];
  supporterUsedThisTurn: boolean;
  energyAttachedThisTurn: boolean;
  turnFlags: any;
}

export interface SanitizedGameView {
  gameId: string;
  engineVersion: string;
  rulesetVersion: string;
  status: string;
  phase: string;
  turnNumber: number;
  activePlayerId: PlayerId;
  firstPlayerId: PlayerId;
  viewingPlayerId: PlayerId;
  players: Record<PlayerId, SanitizedPlayerView>;
  stadium?: CardInstance;
  pendingChoices: any[];
}

export class PlayerView {
  public static createPlayerView(state: GameState, viewingPlayerId: PlayerId): SanitizedGameView {
    const sanitizePlayer = (pid: PlayerId, pState: PlayerState): SanitizedPlayerView => {
      const isSelf = pid === viewingPlayerId;

      return {
        id: pid,
        handCount: pState.hand.length,
        hand: isSelf ? [...pState.hand] : undefined,
        deckCount: pState.deck.length,
        discardPile: [...pState.discardPile],
        prizeCount: pState.prizeCards.length,
        prizeCards: undefined,
        activePokemon: pState.activePokemon ? { ...pState.activePokemon } : undefined,
        bench: pState.bench.map((b) => (b ? { ...b } : undefined)),
        supporterUsedThisTurn: pState.supporterUsedThisTurn,
        energyAttachedThisTurn: pState.energyAttachedThisTurn,
        turnFlags: { ...pState.turnFlags },
      };
    };

    return {
      gameId: state.gameId,
      engineVersion: state.engineVersion,
      rulesetVersion: state.rulesetVersion,
      status: state.status,
      phase: state.phase,
      turnNumber: state.turnNumber,
      activePlayerId: state.activePlayerId,
      firstPlayerId: state.firstPlayerId,
      viewingPlayerId,
      players: {
        P1: sanitizePlayer('P1', state.players.P1),
        P2: sanitizePlayer('P2', state.players.P2),
      },
      stadium: state.stadium ? { ...state.stadium } : undefined,
      pendingChoices: state.pendingChoices.filter((c) => c.player === viewingPlayerId),
    };
  }
}
