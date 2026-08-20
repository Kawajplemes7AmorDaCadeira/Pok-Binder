# Effect Engine Architecture

## Overview
The Effect Engine provides a declarative, JSON-serializable Effect DSL for executing Pokémon TCG card effects, abilities, and trainer cards without hardcoding rules into the core game engine.

## Key Components
1. **EffectDefinitions**: Discriminated union defining declarative effects (`DRAW`, `DAMAGE`, `HEAL`, `COIN_FLIP`, etc.).
2. **EffectRegistry**: Central store linking effect types to their respective `EffectResolver` implementations.
3. **EffectEngine**: Orchestrator that validates conditions, resolves targets, executes resolvers, emits events, and handles paused resolutions (`EffectResolutionState`).
