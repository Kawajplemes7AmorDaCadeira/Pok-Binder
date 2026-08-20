/**
 * EffectRegistry.ts - Registry storing effect resolvers by effect type.
 */

import { EffectResolver } from './EffectResolver';
import { EffectType } from './EffectTypes';

export class EffectRegistry {
  private static resolvers: Map<EffectType, EffectResolver> = new Map();

  public static register(type: EffectType, resolver: EffectResolver): void {
    this.resolvers.set(type, resolver);
  }

  public static get(type: EffectType): EffectResolver | undefined {
    return this.resolvers.get(type);
  }

  public static has(type: EffectType): boolean {
    return this.resolvers.has(type);
  }

  public static listRegisteredTypes(): EffectType[] {
    return Array.from(this.resolvers.keys());
  }
}
