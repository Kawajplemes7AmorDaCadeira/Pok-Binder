/**
 * DamageResolver.ts - Pipeline for damage calculation (base damage, weakness, resistance, final damage).
 */

export interface DamageCalculationResult {
  baseDamage: number;
  weaknessMultiplier: number;
  resistanceReduction: number;
  finalDamage: number;
  breakdown: string;
}

export class DamageResolver {
  public static calculateDamage(
    baseDamage: number,
    attackerTypes: string[] = [],
    defenderWeaknesses: { type: string; value: string }[] = [],
    defenderResistances: { type: string; value: number }[] = []
  ): DamageCalculationResult {
    let damage = baseDamage;
    let weaknessMultiplier = 1;
    let resistanceReduction = 0;

    // Check Weakness (typically x2)
    for (const w of defenderWeaknesses) {
      if (attackerTypes.includes(w.type)) {
        weaknessMultiplier = 2;
        damage *= 2;
        break;
      }
    }

    // Check Resistance (typically -30)
    for (const r of defenderResistances) {
      if (attackerTypes.includes(r.type)) {
        resistanceReduction = r.value || 30;
        damage -= resistanceReduction;
        break;
      }
    }

    const finalDamage = Math.max(0, damage);
    const breakdown = `Base: ${baseDamage}, Weakness: x${weaknessMultiplier}, Resistance: -${resistanceReduction} -> Final: ${finalDamage}`;

    return {
      baseDamage,
      weaknessMultiplier,
      resistanceReduction,
      finalDamage,
      breakdown,
    };
  }
}
