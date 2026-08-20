import { GameState, PlayerId, PokemonInPlay, CardInstance, CardEffect, GameEvent, SpecialCondition } from './types';
import { RuleEngine } from './RuleEngine';

export class EffectEngineClass {
  // Execute a specific CardEffect on the GameState, returning generated events
  execute(state: GameState, controllerId: PlayerId, effect: CardEffect, context?: { sourceCardId?: string; sourcePokemonId?: string }): GameEvent[] {
    const events: GameEvent[] = [];
    const player = state.players[controllerId];
    const opponentId: PlayerId = controllerId === 'P1' ? 'P2' : 'P1';
    const opponent = state.players[opponentId];

    switch (effect.type) {
      case 'DRAW': {
        const drawAmount = Math.min(effect.amount, player.deck.length);
        for (let i = 0; i < drawAmount; i++) {
          const card = player.deck.shift();
          if (card) {
            player.hand.push(card);
            events.push({
              type: 'CARD_DRAWN',
              player: controllerId,
              cardName: card.card.name,
            });
          }
        }
        break;
      }

      case 'DAMAGE': {
        const targetPokemon = this.resolveTarget(state, controllerId, effect.target);
        if (targetPokemon) {
          let finalDmd = effect.amount;

          // Apply Weakness / Resistance logic if attacking
          const activeCard = targetPokemon.evolutionStack[targetPokemon.evolutionStack.length - 1].card;
          const attacker = state.players[controllerId].active;
          if (attacker) {
            const attackerCard = attacker.evolutionStack[attacker.evolutionStack.length - 1].card;
            const attackerTypes = attackerCard.types || [];

            // Apply Weakness (x2)
            const hasWeakness = activeCard.weaknesses?.some((w) => attackerTypes.includes(w.type));
            if (hasWeakness) {
              finalDmd *= 2;
            }

            // Apply Resistance (-30)
            const hasResistance = activeCard.resistances?.some((r) => attackerTypes.includes(r.type));
            if (hasResistance) {
              finalDmd = Math.max(0, finalDmd - 30);
            }
          }

          targetPokemon.damage += finalDmd;
          events.push({
            type: 'DAMAGE_DEALT',
            source: context?.sourcePokemonId || 'Attack',
            target: targetPokemon.instanceId,
            amount: finalDmd,
            cause: 'ATTACK',
          });
          
          events.push({
            type: 'LOG_MESSAGE',
            message: `⚔️ ${targetPokemon.evolutionStack[targetPokemon.evolutionStack.length - 1].card.name} recebeu ${finalDmd} de dano!`,
          });
        }
        break;
      }

      case 'PLACE_DAMAGE_COUNTERS': {
        const targetPokemon = this.resolveTarget(state, controllerId, effect.target);
        if (targetPokemon) {
          const dmg = effect.counters * 10;
          targetPokemon.damage += dmg;
          events.push({
            type: 'DAMAGE_COUNTERS_PLACED',
            target: targetPokemon.instanceId,
            count: effect.counters,
          });
          events.push({
            type: 'LOG_MESSAGE',
            message: `🎯 Colocou ${effect.counters} marcadores de dano em ${targetPokemon.evolutionStack[targetPokemon.evolutionStack.length - 1].card.name}.`,
          });
        }
        break;
      }

      case 'HEAL': {
        const targetPokemon = this.resolveTarget(state, controllerId, effect.target);
        if (targetPokemon) {
          const healAmount = Math.min(effect.amount, targetPokemon.damage);
          targetPokemon.damage -= healAmount;
          events.push({
            type: 'LOG_MESSAGE',
            message: `💚 Curou ${healAmount} de dano de ${targetPokemon.evolutionStack[targetPokemon.evolutionStack.length - 1].card.name}.`,
          });
        }
        break;
      }

      case 'APPLY_CONDITION': {
        const targetPokemon = this.resolveTarget(state, controllerId, effect.target);
        if (targetPokemon) {
          if (!targetPokemon.specialConditions.includes(effect.condition)) {
            // Remove contradictory conditions if asleep/paralyzed/confused
            if (['ASLEEP', 'PARALYZED', 'CONFUSED'].includes(effect.condition)) {
              targetPokemon.specialConditions = targetPokemon.specialConditions.filter(
                (c) => !['ASLEEP', 'PARALYZED', 'CONFUSED'].includes(c)
              );
            }
            targetPokemon.specialConditions.push(effect.condition);
            events.push({
              type: 'LOG_MESSAGE',
              message: `💤 ${targetPokemon.evolutionStack[targetPokemon.evolutionStack.length - 1].card.name} está agora [${effect.condition}]!`,
            });
          }
        }
        break;
      }

      case 'SWITCH': {
        if (effect.targetId) {
          const benchIdx = player.bench.findIndex((b) => b.instanceId === effect.targetId);
          if (benchIdx >= 0) {
            const oldActive = player.active;
            const newActive = player.bench[benchIdx];
            
            // Clear status conditions upon moving to bench
            if (oldActive) {
              oldActive.specialConditions = [];
              player.bench[benchIdx] = oldActive;
            } else {
              player.bench.splice(benchIdx, 1);
            }

            player.active = newActive;
            events.push({
              type: 'POKEMON_PROMOTED',
              player: controllerId,
              pokemonName: newActive.evolutionStack[newActive.evolutionStack.length - 1].card.name,
            });
          }
        }
        break;
      }

      case 'TAKE_PRIZE': {
        const takeAmount = Math.min(effect.amount, player.prizes.length);
        for (let i = 0; i < takeAmount; i++) {
          const prizeCard = player.prizes.shift();
          if (prizeCard) {
            player.hand.push(prizeCard);
            events.push({
              type: 'PRIZE_TAKEN',
              player: controllerId,
              cardName: prizeCard.card.name,
            });
          }
        }
        break;
      }

      case 'CUSTOM': {
        if (effect.handlerId === 'PROF_RESEARCH_DISCARD_DRAW') {
          const currentHandSize = player.hand.length;
          player.discard.push(...player.hand);
          player.hand = [];
          
          events.push({
            type: 'LOG_MESSAGE',
            message: `🧪 Professor's Research: Descartou ${currentHandSize} cartas da mão.`,
          });

          const drawAmount = Math.min(7, player.deck.length);
          for (let i = 0; i < drawAmount; i++) {
            const card = player.deck.shift();
            if (card) {
              player.hand.push(card);
              events.push({
                type: 'CARD_DRAWN',
                player: controllerId,
                cardName: card.card.name,
              });
            }
          }
        } else if (effect.handlerId === 'IONO_HAND_SHUFFLE') {
          events.push({
            type: 'LOG_MESSAGE',
            message: `🌀 Iono: Cada jogador embaralha sua mão e coloca sob o deck!`,
          });

          // P1 Shuffling and drawing prizes amount
          const p1 = state.players.P1;
          const p1PrizeCount = p1.prizes.length;
          p1.deck.push(...this.shuffle(p1.hand));
          p1.hand = [];
          for (let i = 0; i < p1PrizeCount; i++) {
            const card = p1.deck.shift();
            if (card) p1.hand.push(card);
          }

          // P2 Shuffling and drawing prizes amount
          const p2 = state.players.P2;
          const p2PrizeCount = p2.prizes.length;
          p2.deck.push(...this.shuffle(p2.hand));
          p2.hand = [];
          for (let i = 0; i < p2PrizeCount; i++) {
            const card = p2.deck.shift();
            if (card) p2.hand.push(card);
          }
        }
        break;
      }

      default:
        break;
    }

    return events;
  }

  // Resolve logical card effect target (ACTIVE, OPPONENT_ACTIVE, etc.)
  resolveTarget(state: GameState, controllerId: PlayerId, targetType: string): PokemonInPlay | null {
    const player = state.players[controllerId];
    const opponentId: PlayerId = controllerId === 'P1' ? 'P2' : 'P1';
    const opponent = state.players[opponentId];

    if (targetType === 'ACTIVE') {
      return player.active;
    }
    if (targetType === 'OPPONENT_ACTIVE') {
      return opponent.active;
    }
    if (targetType === 'BENCH' && player.bench.length > 0) {
      return player.bench[0];
    }
    if (targetType === 'OPPONENT_BENCH' && opponent.bench.length > 0) {
      return opponent.bench[0];
    }
    return player.active;
  }

  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export const EffectEngine = new EffectEngineClass();
