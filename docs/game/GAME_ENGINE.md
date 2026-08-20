# Pokémon TCG Battle Engine Architecture

## Overview
The `GameEngine` is a fully deterministic, React-agnostic game simulation engine built for the PokéBinder TCG Battle Arena. It operates on immutable state transitions governed strictly by rules and serializable actions.

## Core Flow
```
Action (Intent)
    ↓
GameEngine.dispatch(state, action)
    ↓
RuleValidator.validateAction(state, action)
    ↓ (If legal)
Immutable State Transition + RNG update
    ↓
EventBus.emit(events)
    ↓
New GameState + DispatchResult
```

## Principles
1. **Determinism**: All randomness uses `SeededRandom` (Mulberry32). `Math.random()` is strictly forbidden inside `src/game/`.
2. **Immutability**: Actions never mutate state in place. Invalid actions return the exact same state without partial updates.
3. **Serialization**: `GameState`, `GameAction`, and `GameEvent` are 100% JSON-serializable, enabling replay and multiplayer readiness.
