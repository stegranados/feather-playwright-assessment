import { TestTimeouts } from '../lib/constants';
import { getAuthEnv } from '../lib/env';
import { test } from '../lib/fixtures/page-fixtures';
import { MailinatorInbox } from '../lib/mailinator-provider';
import { createFeathrOtpWatch } from '../lib/test-helpers/feathr-otp-watch';
import { manualStep } from '../lib/test-helpers/manual-step';
import { CREATABLE_CAMPAIGN_TYPES } from './data/creatable-campaign-types';

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

    await page.waitForLoadState('networkidle');
  });

  for (const { key } of CREATABLE_CAMPAIGN_TYPES) {
    test.skip(`clones published ${key} campaign when one exists`, async ({ marketingPage }) => {
      test.slow();
      const filtersOk = await manualStep(
        1,
        `Apply Published + Type filters for ${key}`,
        async () => marketingPage.tryApplyPublishedAndTypeFilters(key),
        { campaignType: key }
      );

      if (!filtersOk) {
        test.skip(true, `Campaign type "${key}" is not available in Marketing -> Filters -> Type.`);
        return;
      }

      const sourceName = await manualStep(
        2,
        'Detect a published row for this type',
        async () => marketingPage.mktgrid_getFirstPublishedCampaignRowNameOrNull(),
        { campaignType: key }
      );

      if (!sourceName) {
        test.skip(true, `No published ${key} campaign exists in the grid for this account.`);
        return;
      }

      const clonesBefore = await manualStep(
        3,
        'Count existing draft clones for that campaign name',
        async () => marketingPage.countDraftCloneRowsForBaseName(sourceName),
        { campaignType: key, sourceName }
      );

      await manualStep(
        4,
        'Open More options, duplicate the campaign, and confirm cloning',
        async () => marketingPage.duplicatePublishedCampaignByName(sourceName, { typeLabel: key }),
        { campaignType: key, sourceName }
      );

      await manualStep(
        5,
        'Wait until a new draft clone appears',
        async () => marketingPage.expectDraftCloneCountIncreased(sourceName, clonesBefore),
        { campaignType: key, sourceName, clonesBefore }
      );

      await manualStep(
        6,
        'Open the clone and verify the editor loads',
        async () => marketingPage.openFirstDraftCloneEditor(sourceName),
        { campaignType: key, sourceName }
      );
    });
  }
});
