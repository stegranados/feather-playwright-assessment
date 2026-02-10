# Troubleshooting

Common issues and solutions.

## Mixin Issues

### Mixin methods not found (TypeScript error)

**Symptom:** TypeScript shows errors like `Property 'nav_clickHome' does not exist on type 'DashboardPage'`

**Cause:** Missing interface declaration.

**Solution:** Add the interface merge after your class:

```typescript
export class DashboardPage {
  // ...
}

// Add this line
export interface DashboardPage extends NavigationMixin, TableMixin {}

applyMixins(DashboardPage, [NavigationMixin, TableMixin]);
```

### Mixin methods not found at runtime

**Symptom:** Test fails with `dashboardPage.nav_clickHome is not a function`

**Cause:** `applyMixins` not called or called incorrectly.

**Solution:** Ensure `applyMixins` is called at module level, after the class:

```typescript
export class DashboardPage { ... }
export interface DashboardPage extends NavigationMixin {}

// Must be at module level, not inside a function
applyMixins(DashboardPage, [NavigationMixin]);
```

### IntelliSense not working for mixin methods

**Symptom:** Autocomplete doesn't show mixin methods.

**Solution:**

1. Ensure interface declaration exists
2. Restart TypeScript server: `Cmd+Shift+P` > "TypeScript: Restart TS Server"
3. Check `tsconfig.json` includes the mixin files

### ESLint `no-redeclare` error

**Symptom:** ESLint error on interface declaration.

**Solution:** Add disable comment:

```typescript
// eslint-disable-next-line no-redeclare
export interface DashboardPage extends NavigationMixin {}
```

## Allure Issues

### Allure report not generating

**Symptom:** `allure-results/` folder is empty or missing.

**Solutions:**

1. Verify reporter is configured in `playwright.config.ts`:

```typescript
reporter: [
  ['allure-playwright', { outputFolder: 'allure-results' }],
],
```

2. Run tests first, then generate:

```bash
npm test
npm run allure:generate
```

3. Check `allure-playwright` is installed:

```bash
npm install allure-playwright allure-js-commons
```

### Allure command not found

**Symptom:** `allure: command not found`

**Solution:** Install Allure CLI:

```bash
npm install -g allure-commandline
# Or use npx
npx allure generate allure-results
```

### Allure report shows no data

**Symptom:** Report opens but shows "No tests found."

**Solutions:**

1. Check `allure-results/` contains `.json` files
2. Regenerate: `npm run allure:generate`
3. Clear old results: `rm -rf allure-results allure-report`

## Configuration Issues

### BASE_URL not loading

**Symptom:** Tests navigate to wrong URL or `localhost`.

**Solutions:**

1. Check `.env` file exists and has `BASE_URL`:

```bash
cat .env
# Should show: BASE_URL=https://your-app.com
```

2. Verify dotenv is loaded in config:

```typescript
// playwright.config.ts
import dotenv from 'dotenv';
dotenv.config();
```

3. Restart test runner after changing `.env`

### Tests timeout on CI but pass locally

**Solutions:**

1. Increase timeouts in `playwright.config.ts`:

```typescript
timeout: 10 * 60 * 1000,  // 10 minutes
use: {
  actionTimeout: 30000,
  navigationTimeout: 60000,
},
```

2. Add explicit waits for dynamic content:

```typescript
await page.waitForLoadState('networkidle');
```

3. Check CI has enough resources (memory, CPU)

### Wrong browser installed

**Symptom:** `browserType.launch: Executable doesn't exist`

**Solution:**

```bash
# Install specific browser
npx playwright install chromium --with-deps

# Or install all
npx playwright install --with-deps
```

## Test Issues

### Flaky tests

**Symptoms:** Tests pass sometimes, fail sometimes.

**Solutions:**

1. Add retries:

```typescript
// playwright.config.ts
retries: 2,
```

2. Use proper waits instead of `page.waitForTimeout`:

```typescript
// Bad
await page.waitForTimeout(2000);

// Good
await expect(locator).toBeVisible();
await page.waitForLoadState('networkidle');
```

3. Make locators more specific:

```typescript
// Bad (might match multiple elements)
page.locator('button')

// Good
page.getByRole('button', { name: 'Submit' })
```

### Element not found

**Symptom:** `locator.click: Error: locator resolved to N elements`

**Solutions:**

1. Make locator more specific:

```typescript
// Instead of
page.locator('.btn')

// Use
page.locator('.btn').first()
// Or
page.getByRole('button', { name: 'Specific Name' })
```

2. Use `getByTestId` with unique IDs:

```typescript
page.getByTestId('submit-button')
```

### Tests interfering with each other

**Symptom:** Tests pass individually but fail when run together.

**Solutions:**

1. Ensure test isolation (each test starts fresh)
2. Don't share state between tests
3. Use `test.describe.serial()` if order matters:

```typescript
test.describe.serial('sequential tests', () => {
  test('first', async () => { ... });
  test('second', async () => { ... });
});
```

## Browser Issues

### Browser crashes

**Symptom:** `browserType.launch: Browser closed unexpectedly`

**Solutions:**

1. Reinstall browsers:

```bash
npx playwright install --force
```

2. On Linux, install dependencies:

```bash
npx playwright install-deps
```

3. Reduce parallel workers:

```bash
npx playwright test --workers=1
```

### Headed mode doesn't show browser

**Symptom:** `--headed` flag doesn't open visible browser.

**Solutions:**

1. On CI/remote machines, headed mode won't work (no display)
2. Locally, check no `headless: true` override in config
3. Try: `npx playwright test --headed --project=chromium`

## Logging Issues

### Logs not appearing

**Symptom:** Console shows no log output.

**Solutions:**

1. Check `LOG_LEVEL` in `.env`:

```
LOG_LEVEL=debug
```

2. Import logger correctly:

```typescript
import logger from '../lib/utils/logger';
const log = logger({ filename: __filename });
```

### Too many logs

**Solution:** Set `LOG_LEVEL=warn` or `LOG_LEVEL=error` in `.env`.

## Getting Help

If issues persist:

1. Check Playwright docs: https://playwright.dev/docs
2. Search Playwright GitHub issues
3. Run with debug: `DEBUG=pw:api npx playwright test`
4. Generate trace: `npx playwright test --trace on`
