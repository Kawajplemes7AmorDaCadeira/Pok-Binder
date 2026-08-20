# Knockout Architecture

## Overview
When a Pokémon's accumulated damage meets or exceeds its maximum HP, it is Knocked Out.

## Resolution
1. All cards in the evolution stack, attached energy, and attached tools are moved to the owner's discard pile (`validateCardConservation` enforced).
2. The knocked-out Pokémon is removed from play.
3. The opponent takes Prize card(s).
4. The owner must promote a new Active Pokémon from their Bench.
