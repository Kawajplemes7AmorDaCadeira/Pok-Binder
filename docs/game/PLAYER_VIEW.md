# Player View & Hidden Information Architecture

## Overview
The `PlayerView` service provides a sanitized, secure view of the `GameState` tailored to a specific player (`P1` or `P2`).

## Privacy & Hidden Information
- **Hands**: Players can see their own hand cards, but only receive `handCount` (e.g. 5) for the opponent.
- **Decks**: Deck contents are hidden; only `deckCount` is exposed.
- **Prize Cards**: Prize contents are hidden; only `prizeCount` is exposed.
- **Public Board**: Active Pokémon, bench Pokémon, attached energy, damage counters, and discard piles are fully public.
