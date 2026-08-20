/**
 * GamePhase.ts - Game phase state machine definitions.
 */

export type GamePhase =
  | 'INITIALIZING'
  | 'SETUP_DRAW'
  | 'SETUP_BASIC'
  | 'SETUP_PRIZES'
  | 'TURN_START'
  | 'DRAW'
  | 'MAIN'
  | 'ATTACK'
  | 'BETWEEN_TURNS'
  | 'TURN_END'
  | 'GAME_OVER';

export type PlayerId = 'P1' | 'P2';

export type SpecialCondition =
  | 'ASLEEP'
  | 'BURNED'
  | 'CONFUSED'
  | 'PARALYZED'
  | 'POISONED';

export type GameWinReason =
  | 'PRIZES_TAKEN'
  | 'NO_POKEMON_IN_PLAY'
  | 'DECK_OUT'
  | 'CONCEDE';
