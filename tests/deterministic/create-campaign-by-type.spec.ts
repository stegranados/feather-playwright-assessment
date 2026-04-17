import { TestTimeouts } from '../../lib/constants';
import { getAuthEnv } from '../../lib/env';
import { test } from '../../lib/fixtures/page-fixtures';
import { MailinatorInbox } from '../../lib/mailinator-provider';
import { createFeathrOtpWatch } from '../../lib/test-helpers/feathr-otp-watch';
import { manualStep } from '../../lib/test-helpers/manual-step';
import { CREATABLE_CAMPAIGN_TYPES } from '../data/creatable-campaign-types';

const authEnv = getAuthEnv();

test.describe('Create campaign by type (Marketing → Create)', () => {
  test.describe.configure({ mode: 'default', timeout: TestTimeouts.marketingWizardSuite });

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

  for (const { key, namePattern } of CREATABLE_CAMPAIGN_TYPES) {
    test(`starts ${key} campaign from wizard`, async ({ marketingPage, createCampaignWizardPage}) => {
      test.slow();
      const uniqueName = `E2E ${key} ${Date.now()}`;

      await manualStep(1, 'Open Marketing → All and Create', async () => marketingPage.openCreateCampaignWizard(),
        { campaignType: key });

      await manualStep(2, `Choose campaign type: ${key}`, async () => createCampaignWizardPage.chooseCampaignType(key, namePattern),
        { campaignType: key });

      await manualStep(3, 'Name this campaign (project + title)', async () => createCampaignWizardPage.fillNameStep(key, uniqueName),
        { campaignType: key, uniqueName });

      await manualStep(4, 'Complete wizard until editor opens; assert created / in grid', async () => {
        await createCampaignWizardPage.advanceThroughRemainingWizardSteps(key, uniqueName);
        await marketingPage.expectCampaignCreatedOrInGrid(uniqueName);
      }, { campaignType: key, uniqueName });
    });
  }
});
