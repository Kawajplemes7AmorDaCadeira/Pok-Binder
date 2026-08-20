import { GameState, GameAction, ActionResult, PlayerId, PokemonInPlay, CardInstance, GameEvent, PlayerState } from './types';
import { RuleEngine, isBasicCard } from './RuleEngine';
import { EffectEngine } from './EffectEngine';
import { CardRegistry } from './CardRegistry';
import { PokemonCard } from '../types';

export class GameEngineClass {
  // Helper to create a unique ID
  private makeId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Create & Initialize a standard 60-card TCG game
  createGame(deckP1: PokemonCard[], deckP2: PokemonCard[], nameP1 = 'Jogador 1', nameP2 = 'Treinador Oponente'): GameState {
    const p1Instances: CardInstance[] = deckP1.map((c) => ({
      instanceId: `card_${this.makeId()}`,
      card: c,
      ownerId: 'P1',
    }));

    const p2Instances: CardInstance[] = deckP2.map((c) => ({
      instanceId: `card_${this.makeId()}`,
      card: c,
      ownerId: 'P2',
    }));

    // Shuffle both decks
    const shuffledP1 = EffectEngine.shuffle(p1Instances);
    const shuffledP2 = EffectEngine.shuffle(p2Instances);

    // Initial draw of 7 cards
    const handP1 = shuffledP1.slice(0, 7);
    const deckRemainingP1 = shuffledP1.slice(7);

    const handP2 = shuffledP2.slice(0, 7);
    const deckRemainingP2 = shuffledP2.slice(7);

    // Prizes (6 cards)
    const prizesP1 = deckRemainingP1.slice(0, 6);
    const finalDeckP1 = deckRemainingP1.slice(6);

    const prizesP2 = deckRemainingP2.slice(0, 6);
    const finalDeckP2 = deckRemainingP2.slice(6);

    // Auto-setup Active Pokémon for both players if they have any basic
    const p1Basic = handP1.find((c) => this.isBasic(c.card));
    const p2Basic = handP2.find((c) => this.isBasic(c.card));

    const activeP1: PokemonInPlay | null = p1Basic ? {
      instanceId: `poke_${this.makeId()}`,
      evolutionStack: [p1Basic],
      damage: 0,
      attachedCards: [],
      attachedEnergy: [],
      specialConditions: [],
      temporaryEffects: [],
      enteredPlayTurn: 1,
      abilityUsage: {},
    } : null;

    const activeP2: PokemonInPlay | null = p2Basic ? {
      instanceId: `poke_${this.makeId()}`,
      evolutionStack: [p2Basic],
      damage: 0,
      attachedCards: [],
      attachedEnergy: [],
      specialConditions: [],
      temporaryEffects: [],
      enteredPlayTurn: 1,
      abilityUsage: {},
    } : null;

    // Filter hand after auto-placing active
    const finalHandP1 = p1Basic ? handP1.filter((c) => c.instanceId !== p1Basic.instanceId) : handP1;
    const finalHandP2 = p2Basic ? handP2.filter((c) => c.instanceId !== p2Basic.instanceId) : handP2;

    const player1: PlayerState = {
      id: 'P1',
      name: nameP1,
      deck: finalDeckP1,
      hand: finalHandP1,
      discard: [],
      prizes: prizesP1,
      active: activeP1,
      bench: [],
      supporterPlayedThisTurn: false,
      stadiumPlayedThisTurn: false,
      energyAttachedThisTurn: false,
      retreatedThisTurn: false,
      mulligans: p1Basic ? 0 : 1,
    };

    const player2: PlayerState = {
      id: 'P2',
      name: nameP2,
      deck: finalDeckP2,
      hand: finalHandP2,
      discard: [],
      prizes: prizesP2,
      active: activeP2,
      bench: [],
      supporterPlayedThisTurn: false,
      stadiumPlayedThisTurn: false,
      energyAttachedThisTurn: false,
      retreatedThisTurn: false,
      mulligans: p2Basic ? 0 : 1,
    };

    const firstPlayer: PlayerId = Math.random() > 0.5 ? 'P1' : 'P2';

    return {
      id: `game_${this.makeId()}`,
      players: { P1: player1, P2: player2 },
      activePlayer: firstPlayer,
      firstPlayer,
      turnNumber: 1,
      phase: 'MAIN',
      pendingEffects: [],
      continuousEffects: [],
      history: [
        { type: 'LOG_MESSAGE', message: `🏟️ Partida criada! ${player1.name} contra ${player2.name}.` },
        { type: 'LOG_MESSAGE', message: `🪙 Moeda lançada! ${firstPlayer === 'P1' ? player1.name : player2.name} começa jogando.` },
      ],
      rng: { seed: Date.now() },
    };
  }

  // Dispatch actions to update state with strict validations
  dispatch(state: GameState, action: GameAction): ActionResult {
    const validation = RuleEngine.validate(state, action);
    if (!validation.valid) {
      return {
        success: false,
        state,
        events: [],
        error: validation.error,
      };
    }

    const nextState = JSON.parse(JSON.stringify(state)) as GameState;
    const player = nextState.players[action.player];
    const opponentId: PlayerId = action.player === 'P1' ? 'P2' : 'P1';
    const opponent = nextState.players[opponentId];
    const events: GameEvent[] = [];

    // Log the received action
    events.push({
      type: 'LOG_MESSAGE',
      message: `🕹️ Ação recebida: [${action.type}] por ${player.name}.`,
    });

    switch (action.type) {
      case 'DRAW_CARD': {
        const drawnEvents = EffectEngine.execute(nextState, action.player, { type: 'DRAW', amount: 1 });
        events.push(...drawnEvents);
        nextState.phase = 'MAIN';
        break;
      }

      case 'PLAY_BASIC': {
        const handIdx = player.hand.findIndex((c) => c.instanceId === action.cardId);
        if (handIdx >= 0) {
          const cardInstance = player.hand[handIdx];
          player.hand.splice(handIdx, 1);

          const newPoke: PokemonInPlay = {
            instanceId: `poke_${this.makeId()}`,
            evolutionStack: [cardInstance],
            damage: 0,
            attachedCards: [],
            attachedEnergy: [],
            specialConditions: [],
            temporaryEffects: [],
            enteredPlayTurn: nextState.turnNumber,
            abilityUsage: {},
          };

          if (!player.active) {
            player.active = newPoke;
            events.push({
              type: 'POKEMON_PROMOTED',
              player: action.player,
              pokemonName: cardInstance.card.name,
            });
          } else {
            player.bench.push(newPoke);
            events.push({
              type: 'POKEMON_BENCHED',
              player: action.player,
              pokemonName: cardInstance.card.name,
            });
          }
        }
        break;
      }

      case 'EVOLVE': {
        const handIdx = player.hand.findIndex((c) => c.instanceId === action.cardId);
        if (handIdx >= 0) {
          const evoCard = player.hand[handIdx];
          player.hand.splice(handIdx, 1);

          const targetPoke = RuleEngine.findPokemonInPlay(nextState, action.player, action.targetId);
          if (targetPoke) {
            const oldName = targetPoke.evolutionStack[targetPoke.evolutionStack.length - 1].card.name;
            targetPoke.evolutionStack.push(evoCard);
            targetPoke.lastEvolutionTurn = nextState.turnNumber;

            events.push({
              type: 'POKEMON_EVOLVED',
              player: action.player,
              fromName: oldName,
              toName: evoCard.card.name,
            });
          }
        }
        break;
      }

      case 'ATTACH_ENERGY': {
        const handIdx = player.hand.findIndex((c) => c.instanceId === action.cardId);
        if (handIdx >= 0) {
          const energyCard = player.hand[handIdx];
          player.hand.splice(handIdx, 1);

          const targetPoke = RuleEngine.findPokemonInPlay(nextState, action.player, action.targetId);
          if (targetPoke) {
            const type = energyCard.card.name.includes('Fire') ? 'Fire' : 'Water';
            targetPoke.attachedEnergy.push({
              cardInstanceId: energyCard.instanceId,
              providedEnergy: [{ type, amount: 1 }],
            });

            player.energyAttachedThisTurn = true;
            events.push({
              type: 'ENERGY_ATTACHED',
              player: action.player,
              energyName: energyCard.card.name,
              targetName: targetPoke.evolutionStack[targetPoke.evolutionStack.length - 1].card.name,
            });
          }
        }
        break;
      }

      case 'PLAY_TRAINER': {
        const handIdx = player.hand.findIndex((c) => c.instanceId === action.cardId);
        if (handIdx >= 0) {
          const trainerCard = player.hand[handIdx];
          player.hand.splice(handIdx, 1);
          player.discard.push(trainerCard);

          const compiled = CardRegistry.compile(trainerCard.card);
          const effectsToRun = compiled.rules?.[0]?.effects || [];

          events.push({
            type: 'CARD_PLAYED',
            player: action.player,
            cardName: trainerCard.card.name,
          });

          // Mark supporter played if supporter card
          const isSupporter = trainerCard.card.rules?.some((r) => r.toLowerCase().includes('supporter')) ||
                              ['prof. research', 'iono'].includes(trainerCard.card.name.toLowerCase());
          if (isSupporter) {
            player.supporterPlayedThisTurn = true;
          }

          effectsToRun.forEach((effect) => {
            const resultEvents = EffectEngine.execute(nextState, action.player, effect, { sourceCardId: trainerCard.instanceId });
            events.push(...resultEvents);
          });
        }
        break;
      }

      case 'RETREAT': {
        const active = player.active;
        if (active) {
          const requiredEnergy = active.evolutionStack[active.evolutionStack.length - 1].card.retreat || 0;
          
          // Discard retreat cost (colorless / generic selection)
          for (let i = 0; i < requiredEnergy; i++) {
            if (active.attachedEnergy.length > 0) {
              const energy = active.attachedEnergy.pop();
              if (energy) {
                // Find physical card to send to discard pile
                const matchInHand = { instanceId: energy.cardInstanceId, card: { name: 'Energy', category: 'Energy' }, ownerId: action.player } as any;
                player.discard.push(matchInHand);
              }
            }
          }

          player.retreatedThisTurn = true;
          
          // Switch with the first bench card (or trigger selection, let's auto-switch with target or fallback to index 0)
          const targetBenchId = player.bench[0]?.instanceId;
          if (targetBenchId) {
            const switchEvents = EffectEngine.execute(nextState, action.player, { type: 'SWITCH', targetId: targetBenchId });
            events.push(...switchEvents);
          }
        }
        break;
      }

      case 'ATTACK': {
        const active = player.active;
        if (active) {
          const topCard = active.evolutionStack[active.evolutionStack.length - 1].card;
          const compiled = CardRegistry.compile(topCard);
          const attack = compiled.attacks?.find((a) => a.name === action.attackId);

          if (attack) {
            events.push({
              type: 'ATTACK_DECLARED',
              player: action.player,
              pokemonName: topCard.name,
              attackName: attack.name,
            });

            // Execute attack effects structurally
            attack.effects.forEach((effect) => {
              const resEvents = EffectEngine.execute(nextState, action.player, effect, {
                sourceCardId: topCard.id,
                sourcePokemonId: active.instanceId,
              });
              events.push(...resEvents);
            });

            // Attack ends Phase / Turn
            this.executeKnockouts(nextState, events);
            this.checkWinConditions(nextState, events);

            if (!nextState.winner) {
              this.endTurn(nextState, events);
            }
          }
        }
        break;
      }

      case 'END_TURN': {
        this.endTurn(nextState, events);
        break;
      }

      default:
        break;
    }

    // Always run post-action cleanup
    this.executeKnockouts(nextState, events);
    this.checkWinConditions(nextState, events);

    nextState.history.unshift(...events);

    return {
      success: true,
      state: nextState,
      events,
    };
  }

  // End active player's turn and transfer turn control
  private endTurn(state: GameState, events: GameEvent[]) {
    const previousPlayer = state.activePlayer;
    const nextPlayer: PlayerId = previousPlayer === 'P1' ? 'P2' : 'P1';

    // Run Burned / Poisoned checkup phase
    this.runPokemonCheckup(state, events);

    state.activePlayer = nextPlayer;
    state.turnNumber += 1;
    state.phase = 'TURN_START';

    // Reset turn flags
    const nextPlayerState = state.players[nextPlayer];
    nextPlayerState.energyAttachedThisTurn = false;
    nextPlayerState.supporterPlayedThisTurn = false;
    nextPlayerState.stadiumPlayedThisTurn = false;
    nextPlayerState.retreatedThisTurn = false;

    events.push({
      type: 'LOG_MESSAGE',
      message: `➡️ Início de Turno #${state.turnNumber} para ${nextPlayerState.name}!`,
    });

    // Auto-draw starting card
    if (nextPlayerState.deck.length > 0) {
      const drawn = nextPlayerState.deck.shift();
      if (drawn) {
        nextPlayerState.hand.push(drawn);
        events.push({
          type: 'CARD_DRAWN',
          player: nextPlayer,
          cardName: drawn.card.name,
        });
        state.phase = 'MAIN';
      }
    } else {
      state.winner = previousPlayer;
      state.winReason = 'DECK_OUT';
      state.phase = 'GAME_OVER';
      events.push({
        type: 'LOG_MESSAGE',
        message: `🏆 ${state.players[previousPlayer].name} venceu porque o oponente ficou sem cartas no deck! (Deck out)`,
      });
    }
  }

  // Run Poisoned/Burned conditions in TCG Checkup
  private runPokemonCheckup(state: GameState, events: GameEvent[]) {
    ['P1', 'P2'].forEach((pId) => {
      const player = state.players[pId as PlayerId];
      const active = player.active;
      if (active) {
        if (active.specialConditions.includes('POISONED')) {
          active.damage += 10;
          events.push({
            type: 'LOG_MESSAGE',
            message: `☣️ Veneno: ${active.evolutionStack[active.evolutionStack.length - 1].card.name} recebeu 10 de dano no Checkup.`,
          });
        }
        if (active.specialConditions.includes('BURNED')) {
          active.damage += 20;
          events.push({
            type: 'LOG_MESSAGE',
            message: `🔥 Queimadura: ${active.evolutionStack[active.evolutionStack.length - 1].card.name} recebeu 20 de dano no Checkup.`,
          });
        }
      }
    });
  }

  // Look for knockouts on board, discard cards, and distribute prizes
  private executeKnockouts(state: GameState, events: GameEvent[]) {
    ['P1', 'P2'].forEach((pId) => {
      const player = state.players[pId as PlayerId];
      const opponentId: PlayerId = pId === 'P1' ? 'P2' : 'P1';
      const opponent = state.players[opponentId];

      const active = player.active;
      if (active && active.damage >= RuleEngine.getCurrentHP(active, state)) {
        events.push({
          type: 'POKEMON_KNOCKED_OUT',
          player: pId as PlayerId,
          pokemonName: active.evolutionStack[active.evolutionStack.length - 1].card.name,
        });

        events.push({
          type: 'LOG_MESSAGE',
          message: `☠️ ${active.evolutionStack[active.evolutionStack.length - 1].card.name} foi Nocauteado!`,
        });

        // Discard all evolution stages and energies
        player.discard.push(...active.evolutionStack);
        active.attachedCards.forEach((c) => player.discard.push(c));
        player.active = null;

        // Opponent takes prize cards
        const prizeCount = RuleEngine.getPrizeValue(active);
        const takeAmount = Math.min(prizeCount, opponent.prizes.length);
        
        for (let i = 0; i < takeAmount; i++) {
          const prize = opponent.prizes.shift();
          if (prize) {
            opponent.hand.push(prize);
            events.push({
              type: 'PRIZE_TAKEN',
              player: opponentId,
              cardName: prize.card.name,
            });
            events.push({
              type: 'LOG_MESSAGE',
              message: `🏆 ${opponent.name} pegou a Carta de Prêmio: [${prize.card.name}]`,
            });
          }
        }

        // Auto-promote first bench card if active fell
        if (player.bench.length > 0) {
          const newActive = player.bench.shift();
          if (newActive) {
            player.active = newActive;
            events.push({
              type: 'POKEMON_PROMOTED',
              player: pId as PlayerId,
              pokemonName: newActive.evolutionStack[newActive.evolutionStack.length - 1].card.name,
            });
          }
        }
      }

      // Check bench knockouts
      player.bench = player.bench.filter((b) => {
        if (b.damage >= RuleEngine.getCurrentHP(b, state)) {
          events.push({
            type: 'POKEMON_KNOCKED_OUT',
            player: pId as PlayerId,
            pokemonName: b.evolutionStack[b.evolutionStack.length - 1].card.name,
          });

          player.discard.push(...b.evolutionStack);
          b.attachedCards.forEach((c) => player.discard.push(c));

          // Take prize
          const prizeCount = RuleEngine.getPrizeValue(b);
          const takeAmount = Math.min(prizeCount, opponent.prizes.length);
          for (let i = 0; i < takeAmount; i++) {
            const prize = opponent.prizes.shift();
            if (prize) {
              opponent.hand.push(prize);
              events.push({
                type: 'PRIZE_TAKEN',
                player: opponentId,
                cardName: prize.card.name,
              });
            }
          }
          return false;
        }
        return true;
      });
    });
  }

  // Check Game Over conditions
  private checkWinConditions(state: GameState, events: GameEvent[]) {
    const p1 = state.players.P1;
    const p2 = state.players.P2;

    // Condition 1: Prizes Taken
    if (p1.prizes.length === 0) {
      state.winner = 'P1';
      state.winReason = 'PRIZES_TAKEN';
      state.phase = 'GAME_OVER';
      events.push({ type: 'LOG_MESSAGE', message: `🏆 Parabéns! ${p1.name} coletou todos os prêmios e venceu a partida!` });
      return;
    }
    if (p2.prizes.length === 0) {
      state.winner = 'P2';
      state.winReason = 'PRIZES_TAKEN';
      state.phase = 'GAME_OVER';
      events.push({ type: 'LOG_MESSAGE', message: `🏆 Oponente (${p2.name}) coletou todos os prêmios e venceu!` });
      return;
    }

    // Condition 2: No Pokémon left on board (Active and Bench empty)
    const p1HasActive = p1.active !== null;
    const p2HasActive = p2.active !== null;

    if (!p1HasActive && p1.bench.length === 0) {
      state.winner = 'P2';
      state.winReason = 'NO_POKEMON_IN_PLAY';
      state.phase = 'GAME_OVER';
      events.push({ type: 'LOG_MESSAGE', message: `🏆 ${p2.name} venceu! Você ficou sem nenhum Pokémon no campo.` });
      return;
    }
    if (!p2HasActive && p2.bench.length === 0) {
      state.winner = 'P1';
      state.winReason = 'NO_POKEMON_IN_PLAY';
      state.phase = 'GAME_OVER';
      events.push({ type: 'LOG_MESSAGE', message: `🏆 Parabéns! Você derrotou todos os Pokémons do oponente!` });
      return;
    }
  }

  private isBasic(card: PokemonCard): boolean {
    return isBasicCard(card);
  }
}

export const GameEngine = new GameEngineClass();
