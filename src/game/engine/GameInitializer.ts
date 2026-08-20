/**
 * GameInitializer.ts - Handles match setup, deck shuffling, mulligans, prize placement, and coin flip.
 */

import { GameState } from './GameState';
import { BattleRuleset } from './Ruleset';
import { SeededRandom } from '../rng/SeededRandom';
import { CardInstance } from '../state/CardState';
import { PlayerId } from './GamePhase';

export interface DeckDefinition {
  playerId: PlayerId;
  cardIds: string[]; // List of card IDs in the deck
}

export interface GameInitConfig {
  gameId: string;
  ruleset: BattleRuleset;
  seed: string;
  decks: [DeckDefinition, DeckDefinition];
  // Optional card definition checker callback
  isBasicPokemon?: (cardId: string) => boolean;
}

export class GameInitializer {
  /**
   * Creates initial game state with shuffled decks, initial hand draw, mulligan handling, and prize cards.
   */
  public static createGame(config: GameInitConfig): GameState {
    const rng = new SeededRandom(config.seed);
    const isBasic = config.isBasicPokemon || ((id: string) => id.includes('basic') || id.includes('básico') || !id.includes('stage'));

    const createPlayerState = (deckDef: DeckDefinition) => {
      // 1. Create unique card instances
      let instances: CardInstance[] = deckDef.cardIds.map((cardId, index) => ({
        instanceId: `${deckDef.playerId}_inst_${index}_${Math.abs(rng.int(1000, 999999))}`,
        cardId,
        ownerId: deckDef.playerId,
        originalDeckIndex: index,
      }));

      // 2. Shuffle deck deterministically using SeededRandom
      instances = rng.shuffle(instances);

      return {
        id: deckDef.playerId,
        deck: instances,
        hand: [],
        discardPile: [],
        prizeCards: [],
        bench: [undefined as any, undefined as any, undefined as any, undefined as any, undefined as any],
        supporterUsedThisTurn: false,
        energyAttachedThisTurn: false,
        turnFlags: { supporterCount: 0, manualEnergyAttachments: 0, retreatedThisTurn: false },
        effects: [],
      };
    };

    const p1State = createPlayerState(config.decks[0]);
    const p2State = createPlayerState(config.decks[1]);

    const mulligans: Record<PlayerId, number> = { P1: 0, P2: 0 };

    // Helper to check valid initial hand (must have at least one basic pokemon)
    const hasBasicPokemon = (hand: CardInstance[]): boolean => {
      return hand.some((c) => isBasic(c.cardId));
    };

    // Helper to resolve mulligans for a player
    const resolveMulligansForPlayer = (playerState: typeof p1State) => {
      let validHand = false;
      while (!validHand) {
        // Return hand to deck
        playerState.deck.push(...playerState.hand);
        playerState.hand = [];
        // Shuffle deck
        playerState.deck = rng.shuffle(playerState.deck);
        // Draw initial hand
        const handSize = config.ruleset.initialHandSize;
        playerState.hand = playerState.deck.splice(0, handSize);

        if (hasBasicPokemon(playerState.hand)) {
          validHand = true;
        } else {
          mulligans[playerState.id]++;
        }
      }
    };

    resolveMulligansForPlayer(p1State);
    resolveMulligansForPlayer(p2State);

    // 3. Set Prize Cards
    const prizeCount = config.ruleset.prizeCount;
    p1State.prizeCards = p1State.deck.splice(0, prizeCount);
    p2State.prizeCards = p2State.deck.splice(0, prizeCount);

    // 4. Coin flip for starting player
    const p1GoesFirst = rng.coinFlip();
    const firstPlayerId: PlayerId = p1GoesFirst ? 'P1' : 'P2';

    const initialState: GameState = {
      gameId: config.gameId,
      engineVersion: '0.1.0',
      rulesetVersion: config.ruleset.id,
      status: 'SETUP',
      phase: 'SETUP_BASIC',
      turnNumber: 1,
      activePlayerId: firstPlayerId,
      firstPlayerId,
      players: {
        P1: p1State,
        P2: p2State,
      },
      setupState: {
        mulligans,
        activeSelected: { P1: false, P2: false },
        setupConfirmed: { P1: false, P2: false },
        prizesPlaced: true,
        startingPlayerResolved: true,
      },
      pendingChoices: [],
      activeEffects: [],
      actionHistory: [],
      rng: rng.getState(),
    };

    return initialState;
  }
}
