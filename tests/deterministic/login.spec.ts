import { TestTimeouts } from '../../lib/constants';
import { getAuthEnv } from '../../lib/env';
import { test, expect } from '../../lib/fixtures/page-fixtures';
import { MailinatorInbox } from '../../lib/mailinator-provider';
import { createFeathrOtpWatch } from '../../lib/test-helpers/feathr-otp-watch';
import { manualStep } from '../../lib/test-helpers/manual-step';
import { AllureHelper } from '../../lib/utils/allure-helper';
import { label } from 'allure-js-commons';
import { expectUrlPathContains, waitForUrlPathContains } from '../../lib/utils/url-waits';

test('Successful login with a valid OTP', async ({ page, loginPage, dashboardPage }) => {
  test.slow();
  const authEnv = getAuthEnv();
  const otpSubject = 'Feathr Login | One-Time Password (OTP)';
  AllureHelper.applyTestMetadata({
    displayName: 'Successful login with a valid OTP',
    description: 'Verifies the login flow for authenticated users',
    tags: ['login', 'otp'],
    severity: 'critical',
    epic: 'Login',
    feature: 'OTP',
    story: 'Successful login with a valid OTP',
    owner: 'Testlio Team',
  });
  await label('testlioManualTestId', 'fdd98b3a-e9c1-4300-8d7a-6bda5337f312');
  const inbox = MailinatorInbox.fromEnv(authEnv.otpUsername);
  const otpWatch = await createFeathrOtpWatch(inbox);
  let fourthOtp = '';

  async function expectNextOtpEmail() {
    const otpEmail = await otpWatch.readNextOtp();
    expect(otpEmail.otp).toBeTruthy();
    expect(otpEmail.message.subject).toContain(otpSubject);
    return otpEmail;
  }

  await manualStep(1, 'Log out and navigate to the login page', async () => {
    await loginPage.navigate();
  }, {
    entryPoint: 'login page',
    expectedHeading: 'Welcome to the nonprofit marketing platform!',
  });

  await manualStep(2, 'Enter a valid email and password', async () => {
    await otpWatch.markOtpTrigger();
    await loginPage.login(authEnv.testUserEmail, authEnv.testUserPassword);
  }, {
    email: authEnv.testUserEmail,
    otpInbox: inbox.emailAddress,
  });

  await manualStep(3, 'You will be redirected to the verification page', async () => {
    await expect(loginPage.inpOtp).toBeVisible({ timeout: TestTimeouts.otpFieldVisible });
  });

  await manualStep(4, 'Verify that an email with an OTP is received', async () => {
    await expectNextOtpEmail();
  });

  await manualStep(5, 'Log in again with your email and password', async () => {
    await loginPage.clickBackToLogin();
    await otpWatch.markOtpTrigger();
    await loginPage.login(authEnv.testUserEmail, authEnv.testUserPassword);
  });

  await manualStep(6, 'Verify OTP screen and check your email; there should be a 2nd email', async () => {
    await expect(loginPage.inpOtp).toBeVisible({ timeout: TestTimeouts.otpFieldVisible });
    await expectNextOtpEmail();
  });

  await manualStep(7, 'Back in the app, enter a bad verification code, e.g. 12345678', async () => {
    await loginPage.enterOtp('12345678');
    await otpWatch.markOtpTrigger();
    await loginPage.submitOtpStep();
    await loginPage.assertOtpErrorVisible();
  }, {
    attemptedOtp: '12345678',
    expectedError: 'Your one-time password is expired or incorrect',
  });

  await manualStep(8, 'Now check your email; there should be a 3rd emails', async () => {
    await expectNextOtpEmail();
  });

  await manualStep(9, 'Back on the app, click on the "Resend code" link', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await otpWatch.markOtpTrigger();
    await loginPage.clickResendCode();
  });

  await manualStep(10, 'Check your email again; there should be a 4th email; copy the 8 character code', async () => {
    const otpEmail = await expectNextOtpEmail();
    fourthOtp = otpEmail.otp;
  }, {
    expectedOtpLength: 8,
  });

  await manualStep(11, 'Back on the app enter the correct code (from the 4th email)', async () => {
    expect(fourthOtp).toBeTruthy();
    await loginPage.enterOtp(fourthOtp);
    await loginPage.submitOtpStep();
  }, {
    otpSource: '4th OTP email',
  });

  await manualStep(12, 'Confirm that the user is redirected to the expected URL', async () => {
    await waitForUrlPathContains(page, '/dashboard', { timeout: TestTimeouts.urlPathContains });
    await expectUrlPathContains(page, '/dashboard', { timeout: TestTimeouts.urlPathContains });
  }, {
    expectedPath: '/dashboard',
  });

  await manualStep(13, 'Verify that buttons, messages, and layout are displayed correctly', async () => {
    await expect(dashboardPage.nav_homeLink).toBeVisible({ timeout: TestTimeouts.dashboardShell });
    await AllureHelper.attachScreenshot('Dashboard page', await page.screenshot());
  });
});
