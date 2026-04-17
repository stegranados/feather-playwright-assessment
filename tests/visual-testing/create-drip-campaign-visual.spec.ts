/**
 * Create Drip campaign — visual testing with MidsceneJS
 *
 * Mirrors the deterministic create-campaign-by-type spec but hardcoded to
 * the Drip campaign type only. Deterministic page-object actions drive the
 * wizard flow; MidsceneJS AI assertions verify the wizard visibility, type
 * selection, and final campaign creation outcome.
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

test.describe('Create Drip campaign — visual (Marketing → Create)', () => {
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

  test('creates Drip campaign from wizard with visual verification', async ({
    page,
    marketingPage,
    createCampaignWizardPage,
    aiAssert,
    aiQuery,
  }) => {
    test.slow();
    const campaignType = 'Drip';
    const namePattern = /^Drip/;
    const uniqueName = `E2E ${campaignType} ${Date.now()}`;

    AllureHelper.applyTestMetadata({
      displayName: 'Create Drip campaign — visual',
      description: 'Creates a Drip campaign via the wizard with MidsceneJS visual assertions on wizard steps and outcome',
      tags: ['create', 'drip', 'visual', 'marketing'],
      severity: 'normal',
      epic: 'Marketing',
      feature: 'Visual Testing',
      story: 'Create Drip campaign',
      owner: 'Testlio Team',
    });

    await manualStep(1, 'Open Marketing → All and open Create wizard', async () => {
      await marketingPage.openCreateCampaignWizard();
    }, { campaignType });

    await manualStep(2, 'Visual checkpoint — campaign creation wizard is visible', async () => {
      await aiAssert('A campaign creation wizard or dialog is visible with campaign type options');
      await AllureHelper.attachScreenshot('Create campaign wizard', await page.screenshot());
    }, { campaignType });

    await manualStep(3, `Choose campaign type: ${campaignType}`, async () => {
      await createCampaignWizardPage.chooseCampaignType(campaignType, namePattern);
    }, { campaignType });

    await manualStep(4, 'Visual checkpoint — Drip type has been selected', async () => {
      await aiAssert('The wizard has advanced past the campaign type selection step');
    }, { campaignType });

    await manualStep(5, 'Name this campaign (project + title)', async () => {
      await createCampaignWizardPage.fillNameStep(campaignType, uniqueName);
    }, { campaignType, uniqueName });

    await manualStep(6, 'Complete wizard until editor opens', async () => {
      await createCampaignWizardPage.advanceThroughRemainingWizardSteps(campaignType, uniqueName);
      await marketingPage.expectCampaignCreatedOrInGrid(uniqueName);
    }, { campaignType, uniqueName });

    await manualStep(7, 'Visual checkpoint — campaign was created successfully', async () => {
      const outcomeInfo = await aiQuery<{ campaignVisible: boolean; visibleText: string }>(
        '{ campaignVisible: boolean (whether there is content on the page suggesting a campaign was created or is being edited), visibleText: string (any heading or title text visible on the page) }',
      );
      expect(outcomeInfo.campaignVisible).toBe(true);

      await AllureHelper.attachScreenshot('Campaign created — visual checkpoint', await page.screenshot());
    }, { campaignType, uniqueName });
  });
});
