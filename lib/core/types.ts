import { Page } from '@playwright/test';

/**
 * Constructor type for classes that can be instantiated.
 */
export type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Constructor type that requires a Page instance.
 */
export type PageConstructor<T = object> = new (page: Page) => T;

/**
 * Options for the applyMixins function.
 */
export interface MixinOptions {
  debug?: boolean;
}

/**
 * Structure for tracking method origins in debug mode.
 */
export interface MethodOrigin {
  methodName: string;
  mixinName: string;
}
