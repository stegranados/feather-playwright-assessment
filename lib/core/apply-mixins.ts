import { MixinOptions } from './types';

/**
 * Registry tracking which mixins are applied to each class.
 */
export const MixinRegistry = new Map<string, string[]>();

/**
 * Copies prototype methods from mixin classes to a target class.
 * Enables composition over inheritance for page objects.
 */
export function applyMixins(
  derivedCtor: any,
  constructors: any[],
  options?: MixinOptions
): void {
  const targetName = derivedCtor.name;
  const mixinNames: string[] = [];

  constructors.forEach((baseCtor) => {
    mixinNames.push(baseCtor.name);

    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name === 'constructor') return;

      if (options?.debug && derivedCtor.prototype[name]) {
        console.warn(
          `[Mixin Collision] "${name}" in ${targetName} will be overwritten by ${baseCtor.name}`
        );
      }

      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
          Object.create(null)
      );
    });
  });

  MixinRegistry.set(targetName, mixinNames);
}

/**
 * Returns the list of mixins applied to a class.
 */
export function getMixinsFor(className: string): string[] {
  return MixinRegistry.get(className) || [];
}
