import { Page, Locator, expect } from '@playwright/test';
import { applyMixins } from '../lib/core/apply-mixins';
import { FormMixin } from '../lib/mixins';

/**
 * Login page object.
 * Composes: FormMixin
 */
export class LoginPage {
  constructor(protected page: Page) {}

  // Page-specific locators

  get loginHeading(): Locator {
    return this.page.getByRole('heading', { name: /sign in|log in|login/i });
  }

  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  get passwordInput(): Locator {
    return this.page.locator('input[type="password"]').first();
  }

  get loginButton(): Locator {
    return this.page.getByRole('button', { name: /sign in|log in|login/i });
  }

  get forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: /forgot password/i });
  }

  get signUpLink(): Locator {
    return this.page.getByRole('link', { name: /sign up|register/i });
  }

  get errorMessage(): Locator {
    return this.page.getByText(/invalid|error|incorrect|failed/i);
  }

  // Page-specific actions

  async navigate(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.loginHeading).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async clickSignUp(): Promise<void> {
    await this.signUpLink.click();
  }

  // Page-specific assertions

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getErrorText(): Promise<string> {
    return (await this.errorMessage.textContent()) || '';
  }

  async waitForLoginSuccess(expectedPath = '/dashboard'): Promise<void> {
    await this.page.waitForURL(new RegExp(expectedPath));
  }
}

// eslint-disable-next-line no-redeclare
export interface LoginPage extends FormMixin {}
applyMixins(LoginPage, [FormMixin]);
