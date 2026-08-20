# Damage Pipeline Architecture

## Overview
The DamageResolver processes attack damage through a rigorous pipeline:
1. **Base Damage**: Specified by the attack definition.
2. **Weakness**: Multiplies damage (typically x2) if defending Pokémon is weak to attacker type.
3. **Resistance**: Reduces damage (typically -30) if defending Pokémon resists attacker type.
4. **Final Damage**: Clamped to a minimum of 0 (`Math.max(0, damage)`).
5. **Application**: Applied as damage counters (`pokemon.damage`) rather than modifying max HP directly.
