# Evolution Rules & Architecture

## Overview
Pokémon evolution allows players to upgrade Pokémon in play (Active or Bench) by placing a matching Stage 1 or Stage 2 Pokémon on top of the existing evolution stack.

## Key Rules Validated
1. **Turn restriction**: A Pokémon cannot evolve on the same turn it entered play, nor on the very first turn of the game.
2. **Evolution frequency**: A Pokémon can only evolve once per turn.
3. **Damage retention**: Damage counters and attached energy/tools remain intact on the Pokémon when it evolves.
4. **Evolution Stack**: The previous cards remain securely in the `evolutionStack` array.
