import { GameState, GameAction, PlayerId, PokemonInPlay } from './types';
import { CardRegistry } from './CardRegistry';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Universal robust helper to determine if a Pokémon card is Basic
export function isBasicCard(card: any): boolean {
  if (!card) return false;
  if (card.category !== 'Pokemon') return false;

  // 1. If we have stage property from API
  if (card.stage) {
    const stageLower = card.stage.toLowerCase();
    if (stageLower.includes('stage') || stageLower.includes('estágio') || stageLower.includes('level') || stageLower.includes('nivel')) {
      return false;
    }
    return stageLower.includes('basic') || stageLower.includes('básico');
  }

  // 2. If we have evolvesFrom property from API
  if (card.evolvesFrom) {
    return false;
  }

  // 3. Parse rules / description text
  const text = ((card.rules || []).join(' ') + ' ' + (card.description || '')).toLowerCase();
  if (text.includes('evolves from') || text.includes('evolui de')) {
    return false;
  }

  // 4. Common Stage 1 and Stage 2 naming suffix/patterns fallback
  const nameLower = card.name.toLowerCase();
  if (
    nameLower.includes('charmeleon') ||
    nameLower.includes('wartortle') ||
    nameLower.includes('ivysaur') ||
    nameLower.includes('raichu') ||
    nameLower.includes('gloom') ||
    nameLower.includes('vileplume') ||
    nameLower.includes('pidgeotto') ||
    nameLower.includes('pidgeot') ||
    nameLower.includes('metapod') ||
    nameLower.includes('butterfree') ||
    nameLower.includes('kakuna') ||
    nameLower.includes('beedrill') ||
    nameLower.includes('kadabra') ||
    nameLower.includes('alakazam') ||
    nameLower.includes('machoke') ||
    nameLower.includes('machamp') ||
    nameLower.includes('haunter') ||
    nameLower.includes('gengar') ||
    nameLower.includes('dragonair') ||
    nameLower.includes('dragonite') ||
    nameLower.includes('pupitar') ||
    nameLower.includes('tyranitar') ||
    nameLower.includes('marshtomp') ||
    nameLower.includes('swampert') ||
    nameLower.includes('vibrava') ||
    nameLower.includes('flygon') ||
    nameLower.includes('gabite') ||
    nameLower.includes('garchomp') ||
    nameLower.includes('fraxure') ||
    nameLower.includes('haxorus') ||
    nameLower.includes('zweilous') ||
    nameLower.includes('hydreigon') ||
    nameLower.includes('sliggoo') ||
    nameLower.includes('goodra') ||
    nameLower.includes('dartrix') ||
    nameLower.includes('decidueye') ||
    nameLower.includes('torracat') ||
    nameLower.includes('incineroar') ||
    nameLower.includes('brionne') ||
    nameLower.includes('primarina') ||
    nameLower.includes('floragato') ||
    nameLower.includes('meowscarada') ||
    nameLower.includes('crocalor') ||
    nameLower.includes('skeledirge') ||
    nameLower.includes('quaxwell') ||
    nameLower.includes('quaquaval')
  ) {
    return false;
  }

  // Pokémon ex: check standard List of Stage 2 ex
  if (nameLower.endsWith('ex') || nameLower.includes(' ex ')) {
    if (
      nameLower.includes('charizard') || 
      nameLower.includes('blastoise') || 
      nameLower.includes('venusaur') ||
      nameLower.includes('dragonite') ||
      nameLower.includes('gengar') ||
      nameLower.includes('alakazam') ||
      nameLower.includes('decidueye') ||
      nameLower.includes('skeledirge') ||
      nameLower.includes('meowscarada') ||
      nameLower.includes('quaquaval')
    ) {
      return false;
    }
  }

  return true;
}

export class RuleEngineClass {
  // Validate if an action is allowed on the current game state
  validate(state: GameState, action: GameAction): ValidationResult {
    const activePlayerId = state.activePlayer;

    // Reject action if winner already declared
    if (state.winner) {
      return { valid: false, error: 'A partida já terminou!' };
    }

    // Verify it is the correct player's turn (except for choices)
    if (action.type !== 'MAKE_CHOICE' && action.player !== activePlayerId) {
      return { valid: false, error: 'Não é o seu turno!' };
    }

    const player = state.players[action.player];

    switch (action.type) {
      case 'DRAW_CARD': {
        if (state.phase !== 'TURN_START') {
          return { valid: false, error: 'Você só pode comprar uma carta no início do turno!' };
        }
        return { valid: true };
      }

      case 'PLAY_BASIC': {
        if (state.phase !== 'MAIN') {
          return { valid: false, error: 'Você só pode invocar Pokémons na sua Fase Principal!' };
        }
        const cardInstance = player.hand.find((c) => c.instanceId === action.cardId);
        if (!cardInstance) {
          return { valid: false, error: 'A carta não está na sua mão!' };
        }
        if (cardInstance.card.category !== 'Pokemon') {
          return { valid: false, error: 'Esta carta não é um Pokémon!' };
        }

        // Check if basic (Stage 1 / Stage 2 require Evolve action) using robust dynamic helper
        if (!isBasicCard(cardInstance.card)) {
          return { valid: false, error: 'Este Pokémon é uma evolução! Use a ação de Evolução.' };
        }

        // Limit bench size (default 5)
        const benchLimit = this.getBenchLimit(state, action.player);
        if (player.bench.length >= benchLimit) {
          return { valid: false, error: `Seu banco está cheio! (Limite: ${benchLimit})` };
        }

        return { valid: true };
      }

      case 'EVOLVE': {
        if (state.phase !== 'MAIN') {
          return { valid: false, error: 'Você só pode evoluir na sua Fase Principal!' };
        }
        const cardInstance = player.hand.find((c) => c.instanceId === action.cardId);
        if (!cardInstance) {
          return { valid: false, error: 'A carta de evolução não está na sua mão!' };
        }

        const targetPokemon = this.findPokemonInPlay(state, action.player, action.targetId);
        if (!targetPokemon) {
          return { valid: false, error: 'Pokémon alvo não encontrado em campo!' };
        }

        // Rule: Cannot evolve on Turn 1 of any player
        if (state.turnNumber === 1) {
          return { valid: false, error: 'Nenhum jogador pode evoluir no primeiro turno do jogo!' };
        }

        // Rule: Cannot evolve a Pokémon on the same turn it entered play
        if (targetPokemon.enteredPlayTurn === state.turnNumber) {
          return { valid: false, error: 'Você não pode evoluir um Pokémon no mesmo turno em que ele foi colocado em campo!' };
        }

        // Rule: Check evolution naming validation
        const basePokemon = targetPokemon.evolutionStack[targetPokemon.evolutionStack.length - 1].card;
        const baseName = basePokemon.name.toLowerCase();
        const evoName = cardInstance.card.name.toLowerCase();

        let allowed = false;
        
        // 1. Dynamic API metadata check
        if (cardInstance.card.evolvesFrom) {
          const targetNameClean = baseName.replace(/\s*ex$/i, '').trim();
          const evolvesFromClean = cardInstance.card.evolvesFrom.toLowerCase().replace(/\s*ex$/i, '').trim();
          if (targetNameClean === evolvesFromClean || targetNameClean.includes(evolvesFromClean) || evolvesFromClean.includes(targetNameClean)) {
            allowed = true;
          }
        }

        // 2. Text-based rules extraction fallback ("evolves from Charmeleon" / "evolui de Charmeleon")
        if (!allowed) {
          const rulesText = ((cardInstance.card.rules || []).join(' ') + ' ' + (cardInstance.card.description || '')).toLowerCase();
          const matchEvo = rulesText.match(/evolves from\s+([a-z0-9é'\s\-]+)/i) || 
                            rulesText.match(/evolui de\s+([a-z0-9é'\s\-]+)/i);
          if (matchEvo) {
            const parsedEvoFrom = matchEvo[1].trim().replace(/\s*ex$/i, '').trim();
            const targetNameClean = baseName.replace(/\s*ex$/i, '').trim();
            if (targetNameClean === parsedEvoFrom || targetNameClean.includes(parsedEvoFrom) || parsedEvoFrom.includes(targetNameClean)) {
              allowed = true;
            }
          }
        }

        // 3. Strict substring/fallback name compatibility
        if (!allowed) {
          const baseNameClean = baseName.replace(/\s*ex$/i, '').trim();
          const evoNameClean = evoName.replace(/\s*ex$/i, '').trim();
          
          if (baseNameClean === 'charmander' && evoNameClean === 'charmeleon') allowed = true;
          if (baseNameClean === 'charmeleon' && evoNameClean === 'charizard') allowed = true;
          if (baseNameClean === 'squirtle' && evoNameClean === 'wartortle') allowed = true;
          if (baseNameClean === 'wartortle' && evoNameClean === 'blastoise') allowed = true;
          if (baseNameClean === 'bulbasaur' && evoNameClean === 'ivysaur') allowed = true;
          if (baseNameClean === 'ivysaur' && evoNameClean === 'venusaur') allowed = true;
          if (baseNameClean === 'pikachu' && evoNameClean === 'raichu') allowed = true;

          // Regular -> ex evolution support (e.g., Charizard -> Charizard ex)
          if (evoNameClean === baseNameClean && evoName.includes('ex') && !baseName.includes('ex')) {
            allowed = true;
          }
        }

        if (!allowed) {
          return { valid: false, error: `${cardInstance.card.name} não pode evoluir de ${basePokemon.name}!` };
        }

        return { valid: true };
      }

      case 'ATTACH_ENERGY': {
        if (state.phase !== 'MAIN') {
          return { valid: false, error: 'Você só pode ligar energias na sua Fase Principal!' };
        }
        if (player.energyAttachedThisTurn) {
          return { valid: false, error: 'Você só pode ligar 1 Energia da sua mão por turno!' };
        }

        const cardInstance = player.hand.find((c) => c.instanceId === action.cardId);
        if (!cardInstance) {
          return { valid: false, error: 'A energia não está na sua mão!' };
        }
        if (cardInstance.card.category !== 'Energy') {
          return { valid: false, error: 'Esta carta não é uma Energia!' };
        }

        const targetPokemon = this.findPokemonInPlay(state, action.player, action.targetId);
        if (!targetPokemon) {
          return { valid: false, error: 'Pokémon alvo não encontrado!' };
        }

        return { valid: true };
      }

      case 'PLAY_TRAINER': {
        if (state.phase !== 'MAIN') {
          return { valid: false, error: 'Você só pode jogar cartas de Treinador na sua Fase Principal!' };
        }
        const cardInstance = player.hand.find((c) => c.instanceId === action.cardId);
        if (!cardInstance) {
          return { valid: false, error: 'A carta não está na sua mão!' };
        }
        if (cardInstance.card.category !== 'Trainer') {
          return { valid: false, error: 'Esta carta não é um Treinador!' };
        }

        // Rules for Supporter cards
        const isSupporter = cardInstance.card.rules?.some((r) => r.toLowerCase().includes('supporter')) ||
                            ['prof. research', 'iono'].includes(cardInstance.card.name.toLowerCase());
        
        if (isSupporter) {
          // Rule: First player cannot play supporter on turn 1
          if (state.turnNumber === 1 && state.firstPlayer === action.player) {
            return { valid: false, error: 'O jogador que inicia a partida não pode usar apoiadores (Supporter) no seu primeiro turno!' };
          }
          if (player.supporterPlayedThisTurn) {
            return { valid: false, error: 'Você só pode usar uma carta de Apoiador (Supporter) por turno!' };
          }
        }

        return { valid: true };
      }

      case 'RETREAT': {
        if (state.phase !== 'MAIN') {
          return { valid: false, error: 'Você só pode recuar na sua Fase Principal!' };
        }
        if (player.retreatedThisTurn) {
          return { valid: false, error: 'Você só pode recuar o seu Pokémon Ativo uma vez por turno!' };
        }

        const active = player.active;
        if (!active || active.instanceId !== action.pokemonId) {
          return { valid: false, error: 'Este Pokémon não está na posição Ativo!' };
        }

        // ASLEEP / PARALYZED conditions prevent retreating
        if (active.specialConditions.includes('ASLEEP') || active.specialConditions.includes('PARALYZED')) {
          return { valid: false, error: 'Pokémons Adormecidos (Asleep) ou Paralisados (Paralyzed) não podem recuar!' };
        }

        // Validate retreat cost
        const requiredEnergy = active.evolutionStack[active.evolutionStack.length - 1].card.retreat || 0;
        const totalAttached = active.attachedEnergy.reduce((sum, e) => sum + e.providedEnergy.reduce((s, p) => s + p.amount, 0), 0);
        
        if (totalAttached < requiredEnergy) {
          return { valid: false, error: `Energias insuficientes para o recuo! Necessário: ${requiredEnergy}, Ligado: ${totalAttached}` };
        }

        if (player.bench.length === 0) {
          return { valid: false, error: 'Você não tem Pokémons no banco para promover após o recuo!' };
        }

        return { valid: true };
      }

      case 'ATTACK': {
        if (state.phase !== 'MAIN') {
          return { valid: false, error: 'Você só pode declarar ataques na sua Fase Principal!' };
        }

        // Rule: First player cannot attack on Turn 1
        if (state.turnNumber === 1 && state.firstPlayer === action.player) {
          return { valid: false, error: 'O jogador que inicia a partida não pode atacar no seu primeiro turno!' };
        }

        const active = player.active;
        if (!active) {
          return { valid: false, error: 'Você não tem nenhum Pokémon Ativo para atacar!' };
        }

        if (active.specialConditions.includes('ASLEEP') || active.specialConditions.includes('PARALYZED')) {
          return { valid: false, error: 'Pokémons Adormecidos ou Paralisados não podem atacar!' };
        }

        const topCard = active.evolutionStack[active.evolutionStack.length - 1].card;
        const compiled = CardRegistry.compile(topCard);
        const attack = compiled.attacks?.find((a) => a.name === action.attackId);

        if (!attack) {
          return { valid: false, error: 'Ataque selecionado não encontrado!' };
        }

        // Check energy requirements
        if (!this.canPayAttackCost(active, attack.cost)) {
          return { valid: false, error: `Energias anexadas insuficientes para usar ${attack.name}!` };
        }

        return { valid: true };
      }

      case 'END_TURN': {
        return { valid: true };
      }

      case 'MAKE_CHOICE': {
        if (!state.pendingChoice) {
          return { valid: false, error: 'Nenhuma decisão pendente no momento!' };
        }
        if (state.pendingChoice.player !== action.player) {
          return { valid: false, error: 'Não é sua vez de responder à escolha!' };
        }
        return { valid: true };
      }

      default:
        return { valid: true };
    }
  }

  // Energy cost checking solver (Colors, Fire, Water, Colorless)
  canPayAttackCost(pokemon: PokemonInPlay, cost: string[]): boolean {
    if (!cost || cost.length === 0) return true;

    // Count required elements
    const required: Record<string, number> = {};
    cost.forEach((c) => {
      required[c] = (required[c] || 0) + 1;
    });

    // Count provided elements
    const provided: Record<string, number> = { Fire: 0, Water: 0, Colorless: 0 };
    pokemon.attachedEnergy.forEach((ae) => {
      ae.providedEnergy.forEach((pe) => {
        provided[pe.type] = (provided[pe.type] || 0) + pe.amount;
      });
    });

    // Colorless can be satisfied by any energy (including Fire or Water)
    let colorlessReq = required['Colorless'] || required['Normal'] || 0;
    
    // Check type-specific elements first
    for (const [type, count] of Object.entries(required)) {
      if (type === 'Colorless' || type === 'Normal') continue;
      
      const available = provided[type] || 0;
      if (available < count) {
        return false;
      }
      // Leftovers from type energy can count towards colorless
      provided[type] = available - count;
    }

    // Sum leftovers for Colorless requirement
    const totalLeftovers = Object.values(provided).reduce((sum, val) => sum + val, 0);
    if (totalLeftovers < colorlessReq) {
      return false;
    }

    return true;
  }

  getBenchLimit(state: GameState, player: PlayerId): number {
    // Allows stadium cards or abilities to expand bench later
    return 5;
  }

  getPrizeValue(pokemon: PokemonInPlay): number {
    const cardName = pokemon.evolutionStack[pokemon.evolutionStack.length - 1].card.name.toLowerCase();
    // Rule: ex Pokémon give 2 prizes when knocked out
    if (cardName.includes('ex')) {
      return 2;
    }
    return 1;
  }

  getCurrentHP(pokemon: PokemonInPlay, state: GameState): number {
    const topCard = pokemon.evolutionStack[pokemon.evolutionStack.length - 1].card;
    return topCard.hp || 100;
  }

  findPokemonInPlay(state: GameState, playerId: PlayerId, instanceId: string): PokemonInPlay | null {
    const player = state.players[playerId];
    if (player.active?.instanceId === instanceId) return player.active;
    return player.bench.find((b) => b.instanceId === instanceId) || null;
  }
}

export const RuleEngine = new RuleEngineClass();
