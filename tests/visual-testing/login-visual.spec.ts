/**
 * Basic login — visual testing with MidsceneJS
 *
 * Happy-path only: navigate → credentials → OTP → dashboard.
 * Deterministic page-object actions drive navigation; MidsceneJS
 * AI helpers add visual checkpoints at key moments.
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
import { waitForUrlPathContains } from '../../lib/utils/url-waits';

test('Basic login with visual verification', async ({
  page,
  loginPage,
  dashboardPage,
  ai,
  aiAssert,
  aiQuery,
}) => {
  test.slow();
  const authEnv = getAuthEnv();

  AllureHelper.applyTestMetadata({
    displayName: 'Basic login with visual verification',
    description: 'Happy-path login with MidsceneJS AI visual assertions at key checkpoints',
    tags: ['login', 'otp', 'visual'],
    severity: 'critical',
    epic: 'Login',
    feature: 'Visual Testing',
    story: 'Basic login with visual verification',
    owner: 'Testlio Team',
  });

  const inbox = MailinatorInbox.fromEnv(authEnv.otpUsername);
  const otpWatch = await createFeathrOtpWatch(inbox);

  await manualStep(1, 'Navigate to the login page', async () => {
    await loginPage.navigate();
  }, { entryPoint: 'login page' });

  await manualStep(2, 'Visual checkpoint — login form is visible', async () => {
    await aiAssert('There is a login form with email and password input fields');

    const formInfo = await aiQuery<{ hasEmailField: boolean; hasPasswordField: boolean; hasLoginButton: boolean }>(
      '{ hasEmailField: boolean, hasPasswordField: boolean, hasLoginButton: boolean }',
    );
    expect(formInfo.hasEmailField).toBe(true);
    expect(formInfo.hasPasswordField).toBe(true);
    expect(formInfo.hasLoginButton).toBe(true);
  });

  await manualStep(3, 'Enter credentials and submit', async () => {
    await otpWatch.markOtpTrigger();
    await loginPage.login(authEnv.testUserEmail, authEnv.testUserPassword);
  }, { email: authEnv.testUserEmail });

  await manualStep(4, 'Wait for OTP input to appear', async () => {
    await expect(loginPage.inpOtp).toBeVisible({ timeout: TestTimeouts.otpFieldVisible });
  });

  await manualStep(5, 'AI types a dummy OTP into the input field', async () => {
    await ai('type "12345678" into the one-time password input field');
    await aiAssert('the one-time password input field contains text');
  });

  await manualStep(6, 'Retrieve real OTP and enter it deterministically', async () => {
    const otpEmail = await otpWatch.readNextOtp();
    expect(otpEmail.otp).toBeTruthy();
    await loginPage.enterOtp(otpEmail.otp);
    await loginPage.submitOtpStep();
  });

  await manualStep(7, 'Confirm redirect to dashboard', async () => {
    await waitForUrlPathContains(page, '/dashboard', { timeout: TestTimeouts.urlPathContains });
    await expect(dashboardPage.nav_homeLink).toBeVisible({ timeout: TestTimeouts.dashboardShell });
  });

  await manualStep(8, 'Visual checkpoint — dashboard is visible', async () => {
    await aiAssert('The user is on a dashboard with a navigation sidebar visible');

    const dashboardInfo = await aiQuery<{ hasNavigation: boolean; pageTitle: string }>(
      '{ hasNavigation: boolean, pageTitle: string (the visible heading or title on the page) }',
    );
    expect(dashboardInfo.hasNavigation).toBe(true);

    await AllureHelper.attachScreenshot('Dashboard — visual checkpoint', await page.screenshot());
  });
});
