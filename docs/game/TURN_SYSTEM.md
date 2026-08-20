# Turn System Architecture

## Turn Phases
A turn progresses through explicit phases:
1. **TURN_START**: Resets per-turn flags (`energyAttachedThisTurn`, `supporterUsedThisTurn`, etc.).
2. **DRAW**: Player draws a card from the top of their deck (subject to first-turn rules).
3. **MAIN**: Player can perform legal actions:
   - Play Basic Pokémon to Bench
   - Attach 1 Energy from hand to Pokémon
   - Evolve Pokémon (future)
   - Play Trainers (future)
   - Retreat (future)
   - Attack (future)
4. **BETWEEN_TURNS**: Placeholder hook for status conditions and between-turn effects.
5. **TURN_END**: Concludes the turn, passing initiative to the opponent.
