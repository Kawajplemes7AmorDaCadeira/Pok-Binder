/**
 * SeededRandom.ts - Deterministic Pseudo-Random Number Generator using Mulberry32 algorithm.
 * Fully serializable state for replay, determinism, and testing.
 */

export interface RNGState {
  seed: string;
  state: number;
  calls: number;
}

export class SeededRandom {
  private seed: string;
  private s: number;
  private calls: number = 0;

  constructor(seed: string | number = 'POKEBINDER_DEFAULT_SEED') {
    this.seed = typeof seed === 'number' ? seed.toString() : seed;
    this.s = SeededRandom.hashCode(this.seed);
  }

  /**
   * Simple string hash to 32-bit unsigned integer
   */
  private static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    // Ensure non-zero positive state for Mulberry32
    return Math.abs(hash) || 123456789;
  }

  /**
   * Mulberry32 algorithm: returns a float between 0 (inclusive) and 1 (exclusive)
   */
  public next(): number {
    this.calls++;
    let t = (this.s += 0x6d2b79f5);
    Math.imul;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns random integer between min (inclusive) and max (inclusive)
   */
  public int(min: number, max: number): number {
    const r = this.next();
    return Math.floor(r * (max - min + 1)) + min;
  }

  /**
   * Fisher-Yates shuffle algorithm using SeededRandom
   */
  public shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Pick random item from array
   */
  public pick<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    const index = this.int(0, array.length - 1);
    return array[index];
  }

  /**
   * 50/50 coin flip
   */
  public coinFlip(): boolean {
    return this.next() >= 0.5;
  }

  /**
   * Get serializable RNG state
   */
  public getState(): RNGState {
    return {
      seed: this.seed,
      state: this.s,
      calls: this.calls,
    };
  }

  /**
   * Restore RNG from state
   */
  public static fromState(state: RNGState): SeededRandom {
    const rng = new SeededRandom(state.seed);
    rng.s = state.state;
    rng.calls = state.calls;
    return rng;
  }
}
