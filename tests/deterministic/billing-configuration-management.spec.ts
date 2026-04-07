import { TestTimeouts } from '../../lib/constants';
import { getAuthEnv } from '../../lib/env';
import { test } from '../../lib/fixtures/page-fixtures';
import { MailinatorInbox } from '../../lib/mailinator-provider';
import { createFeathrOtpWatch } from '../../lib/test-helpers/feathr-otp-watch';
import { manualStep } from '../../lib/test-helpers/manual-step';

/**
 * Partial automation for Testlio case “Billing Configuration Management:
 * Set as primary & Delete Scenarios” (`e0ce9e8c-a77e-4948-b42b-e58f1929c5be`).
 *
 * Staging may disable **Add** / **Update** while the billing migration notice is shown;
 * the full create → set primary → swap back path is skipped in that case.
 */
const authEnv = getAuthEnv();

test.describe.skip('Billing configuration management (Settings → Billing → Configurations)', () => {
  test.beforeEach(async ({ page, loginPage, dashboardPage }) => {
    const inbox = MailinatorInbox.fromEnv(authEnv.otpUsername);
    const otpWatch = await createFeathrOtpWatch(inbox);

    await loginPage.navigate();
    await otpWatch.markOtpTrigger();
    await loginPage.login(authEnv.testUserEmail, authEnv.testUserPassword);

    const dashboardIsVisible = await dashboardPage.nav_homeLink
      .isVisible({ timeout: TestTimeouts.dashboardShell })
      .catch(() => false);

    if (!dashboardIsVisible) {
      await test.expect(loginPage.inpOtp).toBeVisible({ timeout: TestTimeouts.otpFieldVisible });
      const otpEmail = await otpWatch.readNextOtp();
      await loginPage.enterOtp(otpEmail.otp);
      await loginPage.submitOtpStep();
      await test.expect(dashboardPage.nav_homeLink).toBeVisible({
        timeout: TestTimeouts.dashboardShell,
      });
    }

    await page.waitForLoadState('domcontentloaded');
  });

  test('opens billing configurations listing', async ({ billingConfigurationsPage }) => {
    await manualStep(1, 'Navigate to Settings → Billing → Configurations', async () =>
      billingConfigurationsPage.open());
    await manualStep(2, 'Navigate to Settings → Billing → Configurations',
      async () => billingConfigurationsPage.open());
    await manualStep(3, 'Primary Billing Configuration block has no Delete', async () =>
      billingConfigurationsPage.expectPrimarySectionHasNoDeleteButton());
    await manualStep(4, 'Additional configuration row exposes Delete', async () =>
      billingConfigurationsPage.expectFirstAdditionalConfigurationHasDelete());
    await manualStep(5, 'Navigate to Settings → Billing → Configurations', async () =>
      billingConfigurationsPage.open());
  });
});

