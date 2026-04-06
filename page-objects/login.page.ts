import { Page, Locator, expect } from '@playwright/test';
import { applyMixins } from '../lib/core/apply-mixins';
import { FormMixin } from '../lib/mixins';

/**
 * Feathr login (staging) page object.
 * Composes: FormMixin — use `form_*` helpers when they match; prefer page-specific locators below for Feathr UI.
 */
export class LoginPage {
  constructor(protected readonly page: Page) { }

  /* Page locators (captured from Feathr login UI) */

  get inpInput(): Locator {
    return this.page.locator('#feathr-email-input');
  }

  /** Password field — accessible name may need tuning if the app copy changes. */
  get passwordInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Password Forgot password?' });
  }

  get btnLogIn(): Locator {
    return this.page.getByRole('button', { name: 'Log in', exact: true });
  }

  get lblWelcomeToTheNonprofitMarketingPlatform(): Locator {
    return this.page.getByText('Welcome to the nonprofit marketing platform!', {
      exact: true,
    });
  }

  /** Shown after password when MFA / email OTP is required — tune name regex if Feathr copy changes. */
  get inpOtp(): Locator {
    return this.page.getByRole('textbox', {
      name: /one-time password|verification code|authentication code/i,
    });
  }

  /** `href="/"` in DOM; prefer accessible name over hashed CSS classes. */
  get lnkBackToLogin(): Locator {
    return this.page.getByRole('link', { name: 'Back to login', exact: true });
  }

  /** Next to “Didn’t receive the code?” on the OTP step. */
  get lnkResendCode(): Locator {
    return this.page.getByText('Resend code', { exact: true });
  }

  /** OTP step validation error (plain text in a `div`; hashed classes are unstable — match copy). */
  get msgOtpExpiredOrIncorrect(): Locator {
    return this.page.getByText('Your one-time password is expired or incorrect', {
      exact: true,
    });
  }

  /** Optional follow-up line under {@link msgOtpExpiredOrIncorrect}. */
  get msgOtpErrorFollowUp(): Locator {
    return this.page.getByText('Check your email for a new one-time password.', {
      exact: true,
    });
  }

  /* Navigation */

  async navigate(): Promise<void> {
    await this.page.goto('/');
    await expect(this.lblWelcomeToTheNonprofitMarketingPlatform).toBeVisible();
  }

  /* Actions */

  async enterInput(value: string): Promise<void> {
    await this.inpInput.fill(value);
  }

  async typeOnPasswordInput(value: string): Promise<void> {
    await this.passwordInput.fill(value);
  }

  async clickLogIn(): Promise<void> {
    await this.btnLogIn.click();
  }

  async isWelcomeToTheNonprofitMarketingPlatformVisible(): Promise<boolean> {
    return await this.lblWelcomeToTheNonprofitMarketingPlatform.isVisible();
  }

  /** Fills email + password and submits — uses Feathr-specific locators above. */
  async login(email: string, password: string): Promise<void> {
    await this.enterInput(email);
    await this.typeOnPasswordInput(password);
    await this.clickLogIn();
  }

  async enterOtp(code: string): Promise<void> {
    await this.inpOtp.fill(code);
  }

  /** Submits the OTP step (button label may be Verify, Continue, etc.). */
  async submitOtpStep(): Promise<void> {
    await this.page.getByRole('button', { name: /verify|continue|submit|confirm/i }).first().click();
  }

  async clickBackToLogin(): Promise<void> {
    await this.lnkBackToLogin.click();
  }

  async clickResendCode(): Promise<void> {
    await this.lnkResendCode.click();
  }

  /** Whether the OTP error banner is currently visible. */
  async isOtpErrorVisible(): Promise<boolean> {
    return await this.msgOtpExpiredOrIncorrect.isVisible();
  }

  /** Fails the assertion if the OTP error banner is not shown. */
  async assertOtpErrorVisible(): Promise<void> {
    await expect(this.msgOtpExpiredOrIncorrect).toBeVisible();
  }
}

// eslint-disable-next-line no-redeclare
export interface LoginPage extends FormMixin { }
applyMixins(LoginPage, [FormMixin]);
