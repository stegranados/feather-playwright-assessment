import { TestTimeouts } from '../../lib/constants';
import { getAuthEnv } from '../../lib/env';
import { expect, test } from '../../lib/fixtures/page-fixtures';
import { MailinatorInbox } from '../../lib/mailinator-provider';
import { createFeathrOtpWatch } from '../../lib/test-helpers/feathr-otp-watch';
import { manualStep } from '../../lib/test-helpers/manual-step';
import { label } from 'allure-js-commons';
import { CLONE_CAMPAIGN_TYPES } from '../data/clone-campaign-types';

const authEnv = getAuthEnv();

test.describe('Clone published campaign (Marketing → All)', () => {
  test.describe.configure({ mode: 'serial', timeout: TestTimeouts.marketingWizardSuite });

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

  for (const { key } of CLONE_CAMPAIGN_TYPES) {
    test(`clones published ${key} campaign when one exists`, async ({ marketingPage }) => {
      test.slow();
      await label(`testlioManualTestId`, 'e44fe8f6-9a32-4cdd-b141-a8e01de3c4a5');
      let sourceCampaignName: string | undefined;

      await manualStep(1, `Navigate to campaign table`,
        async () => marketingPage.openMarketingAll(),
        { campaignType: key }
      );

      await manualStep(2, `Choose a published campaign`,
        async () => {
          await marketingPage.filterPublishedCampaignsOnly();
          await marketingPage.searchForCampaign(key);
          const sourceCampaign = await marketingPage.mktgrid_getFirstPublishedCampaignOrNull();
          expect(
            sourceCampaign,
            `Expected at least one published campaign after filtering by search term ${key}.`
          ).toBeTruthy();
          expect(sourceCampaign?.campaignType).toContain(key);
          expect(sourceCampaign?.status).toContain('Published');
          sourceCampaignName = sourceCampaign?.name;
          const openedCampaign = await marketingPage.mktgrid_openFirstPublishedCampaign();
          expect(openedCampaign.campaignType).toContain(key);
          expect(openedCampaign.status).toContain('Published');
          expect(openedCampaign.name).toBe(sourceCampaignName);
        },
        { campaignType: key }
      );

      await manualStep(3, 'Click on Options', async () => {
        await marketingPage.campaign_moreOptionsButton().click();
        await expect(marketingPage.campaign_duplicateMenuItem()).toBeVisible();
      }, { campaignType: key, sourceCampaignName });


      await manualStep(4, 'Click duplicate', async () => {
        await marketingPage.campaign_duplicateMenuItem().click();
        await expect(marketingPage.campdup_duplicateDialog()).toBeVisible({ timeout: TestTimeouts.marketingDialogVisible });
        expect(await marketingPage.isCampdupCloningNoticeVisible()).toBeTruthy()
        await marketingPage.campaign_duplicateButton().click();
      }, { campaignType: key, sourceCampaignName });

      await manualStep(5, 'Check the modal is automatically closed', async () => {
        await expect(marketingPage.campdup_duplicateDialog()).toBeHidden({ timeout: TestTimeouts.marketingDialogVisible });
        expect(await marketingPage.isCampdupCloneStartedNoticeVisible(sourceCampaignName!)).toBeTruthy();
      }, { campaignType: key, sourceCampaignName });
    });
  }
});
