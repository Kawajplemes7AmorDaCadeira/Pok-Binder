# Actions, Events, and State

## Action (`GameAction`)
An `Action` represents a player's intent to perform a game move (e.g., `DRAW_CARD`, `ATTACH_ENERGY`, `PLAY_BASIC_POKEMON`, `END_TURN`). Actions are structured using TypeScript Discriminated Unions and must be fully serializable.

## Event (`GameEvent`)
An `Event` represents something that *has actually happened* as a result of an action (e.g., `CARD_DRAWN`, `ENERGY_ATTACHED`, `TURN_STARTED`). Events are emitted via the `EventBus`.

## State (`GameState`)
The root state tree containing players, active phase, turn numbers, RNG state, and action history. It contains zero UI state or React references.
