/**
 * MidScene.js AI Visual Demo
 *
 * Demonstrates AI-driven visual interaction alongside traditional Playwright
 * locators. Import from midscene-fixtures instead of page-fixtures to get
 * the ai* helpers injected as test fixtures.
 *
 * Requires MIDSCENE_MODEL_* env vars — see .env.example.
 */
import { test, expect } from '../../lib/fixtures/midscene-fixtures';

test.describe('MidScene AI visual demo', () => {
  test('AI can identify the login page elements visually', async ({
    loginPage,
    aiAssert,
    aiQuery,
  }) => {
    await loginPage.navigate();

    await aiAssert('There is a login form on the page');
    await aiAssert('There is an email input field');
    await aiAssert('There is a password input field');
    await aiAssert('There is a "Log in" button');

    const pageInfo = await aiQuery<{ heading: string; hasLoginButton: boolean }>(
      '{ heading: string (the main heading text on the page), hasLoginButton: boolean }',
    );

    expect(pageInfo.heading).toContain('nonprofit marketing platform');
    expect(pageInfo.hasLoginButton).toBe(true);
  });

  test('AI can interact with form fields by visual description', async ({
    page,
    ai,
    aiAssert,
    aiWaitFor,
  }) => {
    await page.goto('/');
    await aiWaitFor('the login page is fully loaded with a form visible');

    await ai('type "demo@example.com" in the email input field');
    await ai('type "testpassword" in the password input field');

    await aiAssert('the email field contains "demo@example.com"');
    await aiAssert('the password field is filled');
  });
});
