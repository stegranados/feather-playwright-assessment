import { test, expect } from '../lib/fixtures/page-fixtures';
import { AllureHelper } from '../lib/utils/allure-helper';

test.describe('Login Page', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate();
  });

  test('should display login form elements', async ({ loginPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Login form elements visible',
      severity: 'critical',
      feature: 'Authentication',
      story: 'Login Form',
    });

    await expect(loginPage.loginHeading).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Invalid credentials error',
      severity: 'critical',
      feature: 'Authentication',
      story: 'Login Validation',
    });

    await loginPage.login('invalid@example.com', 'wrongpassword');

    const hasError = await loginPage.isErrorVisible();
    expect(hasError).toBe(true);
  });

  test('should use form mixin to fill fields', async ({ loginPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Form mixin field filling',
      severity: 'normal',
      feature: 'Authentication',
      story: 'Form Interactions',
    });

    // Using FormMixin methods
    await loginPage.form_fillEmail('test@example.com');
    await loginPage.form_fillPassword('password123');

    // Verify fields are filled
    const emailValue = await loginPage.form_getFieldValue('email');
    expect(emailValue).toBe('test@example.com');
  });

  test('should navigate to forgot password', async ({ loginPage, page }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Forgot password navigation',
      severity: 'minor',
      feature: 'Authentication',
      story: 'Password Recovery',
    });

    await loginPage.clickForgotPassword();
    await expect(page).toHaveURL(/forgot|reset|password/i);
  });
});
