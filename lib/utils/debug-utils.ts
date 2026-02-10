import { MixinRegistry } from '../core/apply-mixins';

/**
 * Logs class name, applied mixins, and available methods.
 */
export function inspectPageObject(instance: any): void {
  const className = instance.constructor.name;
  const mixins = MixinRegistry.get(className) || [];

  console.log(`\n[${className}]`);
  console.log(`  Mixins: [${mixins.join(', ') || 'none'}]`);
  console.log(`  Methods:`);

  const proto = Object.getPrototypeOf(instance);
  const methods = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor' && typeof instance[name] === 'function'
  );

  methods.forEach((method) => {
    const prefix = method.includes('_') ? method.split('_')[0] : 'page';
    console.log(`    - ${method} (${prefix})`);
  });

  console.log('');
}

/**
 * Returns all mixin names applied to a class.
 */
export function getMixinsFor(className: string): string[] {
  return MixinRegistry.get(className) || [];
}

/**
 * Lists all classes with their applied mixins.
 */
export function listAllMixinApplications(): Map<string, string[]> {
  return new Map(MixinRegistry);
}

/**
 * Checks if a class has a specific mixin applied.
 */
export function hasMixin(className: string, mixinName: string): boolean {
  const mixins = MixinRegistry.get(className) || [];
  return mixins.includes(mixinName);
}

/**
 * Returns method names grouped by their prefix (mixin origin).
 */
export function getMethodsByPrefix(instance: any): Map<string, string[]> {
  const proto = Object.getPrototypeOf(instance);
  const methods = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor' && typeof instance[name] === 'function'
  );

  const grouped = new Map<string, string[]>();

  methods.forEach((method) => {
    const prefix = method.includes('_') ? method.split('_')[0] : 'page';
    const existing = grouped.get(prefix) || [];
    existing.push(method);
    grouped.set(prefix, existing);
  });

  return grouped;
}
