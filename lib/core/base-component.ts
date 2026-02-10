import { Page } from '@playwright/test';

/**
 * Minimal base for page objects and mixins.
 * Intentionally slim - shared behavior belongs in mixins.
 */
export abstract class BaseComponent {
  protected readonly defaultTimeout = 15000;

  constructor(protected page: Page) {}
}
