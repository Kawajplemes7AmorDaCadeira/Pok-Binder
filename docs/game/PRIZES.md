# Prize Cards Architecture

## Overview
Players set aside 6 prize cards at game initialization. When knocking out an opponent's Pokémon, players draw prize cards into their hand.

## Security & View
Prize contents remain hidden until taken into hand. Taking all 6 prize cards triggers an immediate victory condition.
