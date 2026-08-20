# Game Setup Architecture

## Overview
The setup phase of the PokéBinder TCG Battle Arena strictly follows official Pokémon TCG rules:
1. **Deck Preparation & Shuffling**: 60 cards per deck transformed into unique `CardInstance` entities and deterministically shuffled using `SeededRandom`.
2. **Initial Hand Draw**: 7 cards drawn per player.
3. **Mulligan Detection & Resolution**: Hands lacking a Basic Pokémon are automatically returned, shuffled, and redrawn, tracking mulligan counts.
4. **Prize Cards**: Top 6 cards placed into prize zones (hidden info).
5. **Coin Flip**: Determines starting player.
6. **Active & Bench Placement**: Players select a Basic Pokémon for their Active spot and optionally place Basic Pokémon on their Bench before confirming setup.
