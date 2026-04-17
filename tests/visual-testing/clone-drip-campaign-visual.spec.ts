/**
 * Clone published Drip campaign — visual testing with MidsceneJS
 *
 * Mirrors the deterministic clone-published-campaign spec but hardcoded to
 * the Drip campaign type only. Deterministic page-object actions drive
 * navigation and interactions; MidsceneJS AI assertions verify the presence
 * of filtered records, the duplicate dialog, and the success notification.
 *
 * Requires MIDSCENE_MODEL_* env vars — see .env.example.
 */
import { TestTimeouts } from '../../lib/constants';
import { getAuthEnv } from '../../lib/env';
import { test, expect } from '../../lib/fixtures/midscene-fixtures';
import { MailinatorInbox } from '../../lib/mailinator-provider';
import { createFeathrOtpWatch } from '../../lib/test-helpers/feathr-otp-watch';
import { manualStep } from '../../lib/test-helpers/manual-step';
import { AllureHelper } from '../../lib/utils/allure-helper';

const authEnv = getAuthEnv();

test.describe('Clone published Drip campaign — visual (Marketing → All)', () => {
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

  test('clones published Drip campaign with visual verification', async ({
    page,
    marketingPage,
    aiAssert,
    aiQuery,
  }) => {
    test.slow();
    const campaignType = 'Drip';
    let sourceCampaignName: string | undefined;

    AllureHelper.applyTestMetadata({
      displayName: 'Clone published Drip campaign — visual',
      description: 'Clones a published Drip campaign with MidsceneJS visual assertions on filtered records and dialogs',
      tags: ['clone', 'drip', 'visual', 'marketing'],
      severity: 'normal',
      epic: 'Marketing',
      feature: 'Visual Testing',
      story: 'Clone published Drip campaign',
      owner: 'Testlio Team',
    });

    await manualStep(1, 'Navigate to campaign table and filter published Drip campaigns', async () => {
      await marketingPage.filterPublishedCampaignsOnly({ campaignTypeKey: campaignType });
      await marketingPage.searchForCampaign(campaignType);
    }, { campaignType });

    await manualStep(2, 'Visual checkpoint — filtered records are visible in the grid', async () => {
      await aiAssert('The campaign table displays rows with campaign data');

      const gridInfo = await aiQuery<{ hasRows: boolean; visibleStatuses: string[] }>(
        '{ hasRows: boolean (whether at least one data row is visible in the campaign table), visibleStatuses: string[] (the status labels visible in the table rows) }',
      );
      expect(gridInfo.hasRows).toBe(true);

      await AllureHelper.attachScreenshot('Filtered Drip campaigns', await page.screenshot());
    }, { campaignType });

    await manualStep(3, 'Choose the first published campaign', async () => {
      const sourceCampaign = await marketingPage.mktgrid_getFirstPublishedCampaignOrNull();
      expect(
        sourceCampaign,
        `Expected at least one published campaign after filtering by search term ${campaignType}.`,
      ).toBeTruthy();
      expect(sourceCampaign?.campaignType).toContain(campaignType);
      expect(sourceCampaign?.status).toContain('Published');
      sourceCampaignName = sourceCampaign?.name;
      await marketingPage.mktgrid_clickFirstPublishedCampaign();
    }, { campaignType });

    await manualStep(4, 'Click on Options and open Duplicate', async () => {
      await marketingPage.campaign_moreOptionsButton().click();
      await expect(marketingPage.campaign_duplicateMenuItem()).toBeVisible();
      await marketingPage.campaign_duplicateMenuItem().click();
      await marketingPage.campdup_handleContinuePrompt(campaignType);
      await expect(marketingPage.campdup_duplicateDialog()).toBeVisible({
        timeout: TestTimeouts.marketingDialogVisible,
      });
      await marketingPage.campdup_expectCloningNotice();
    }, { campaignType, sourceCampaignName });

    await manualStep(5, 'Visual checkpoint — duplicate dialog is displayed', async () => {
      await aiAssert('A duplicate campaign dialog is displayed with information about cloning');
      await AllureHelper.attachScreenshot('Duplicate dialog', await page.screenshot());
    }, { campaignType, sourceCampaignName });

    await manualStep(6, 'Confirm the duplication', async () => {
      await marketingPage.campaign_duplicateButton().click();
      await expect(marketingPage.campdup_duplicateDialog()).toBeHidden({
        timeout: TestTimeouts.marketingDialogVisible,
      });
    }, { campaignType, sourceCampaignName });

    await manualStep(7, 'Visual checkpoint — clone started notification is visible', async () => {
      await marketingPage.campdup_expectCloneStartedNotice(sourceCampaignName!);
      await aiAssert('A success notification about campaign cloning is visible on the page');
      await AllureHelper.attachScreenshot('Clone started notice', await page.screenshot());
    }, { campaignType, sourceCampaignName });
  });
});
