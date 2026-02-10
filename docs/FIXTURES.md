# Fixtures

This framework uses Playwright fixtures for dependency injection and test lifecycle management.

## Fixture Files

| File | Purpose |
|------|---------|
| `lib/fixtures/helper-fixtures.ts` | Auto-fixtures and utility fixtures |
| `lib/fixtures/page-fixtures.ts` | Page object injection |

## Auto-Fixtures

Auto-fixtures run automatically without being requested in the test signature. They're defined with `{ auto: true }`.

### saveAttachments

Automatically captures console logs and screenshots when a test fails.

**Behavior:**
- Listens to all `console` events during test execution
- On test failure: saves console logs to `logs.txt` and captures a screenshot
- Attaches artifacts to both Playwright and Allure reports

**No action required** - runs automatically on every test.

### saveBrowserVersion

Captures browser version information for debugging.

**Behavior:**
- Records the browser version after each test
- Saves to `{browserName}-version.txt`
- Useful for debugging browser-specific issues

**No action required** - runs automatically on every test.

## Manual Fixtures

### waitForPageLoad

A utility fixture for waiting on page load states.

**Usage:**

```typescript
test('example', async ({ page, waitForPageLoad }) => {
  await page.goto('/some-page');
  await waitForPageLoad();
  // Page is now fully loaded (load, domcontentloaded, networkidle)
});
```

**What it waits for:**
- `load` event (60s timeout)
- `domcontentloaded` event (60s timeout)
- `networkidle` state (60s timeout)

### Page Object Fixtures

Page objects are injected via fixtures defined in `page-fixtures.ts`:

```typescript
test('login test', async ({ loginPage }) => {
  await loginPage.navigate();
  await loginPage.login('user@example.com', 'password');
});

test('dashboard test', async ({ dashboardPage }) => {
  await dashboardPage.navigate();
  await dashboardPage.nav_clickSettings();
});
```

**Available fixtures:**
- `loginPage` - LoginPage instance
- `dashboardPage` - DashboardPage instance
- `reportsPage` - ReportsPage instance

## Fixture Lifecycle

```
test.beforeEach
    |
    v
Auto-fixtures setup (saveAttachments, saveBrowserVersion start listening)
    |
    v
Manual fixtures setup (page objects created)
    |
    v
Test execution
    |
    v
Manual fixtures teardown
    |
    v
Auto-fixtures teardown (artifacts captured if test failed)
    |
    v
test.afterEach
```

## Adding Custom Fixtures

### Adding a Page Object Fixture

1. Create the page object in `page-objects/`:

```typescript
// page-objects/settings.page.ts
export class SettingsPage {
  constructor(protected page: Page) {}
  // ...
}
```

2. Add to `page-fixtures.ts`:

```typescript
import { SettingsPage } from '../../page-objects/settings.page';

interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  reportsPage: ReportsPage;
  settingsPage: SettingsPage;  // Add here
}

export const test = helperFixture.extend<PageFixtures>({
  // ... existing fixtures

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },
});
```

### Adding an Auto-Fixture

```typescript
// In helper-fixtures.ts
myAutoFixture: [
  async ({ page }, use, testInfo) => {
    // Setup code (runs before test)
    console.log('Test starting:', testInfo.title);

    await use();  // Test runs here

    // Teardown code (runs after test)
    console.log('Test finished:', testInfo.status);
  },
  { auto: true },
],
```

### Adding a Utility Fixture

```typescript
// In helper-fixtures.ts
myUtility: async ({ page }, use) => {
  const utility = async (param: string) => {
    // Utility logic
    await page.locator(param).click();
  };
  await use(utility);
},
```

## Test Lifecycle Hooks

The framework includes `beforeEach` and `afterEach` hooks with logging:

**beforeEach:**
- Logs test start with title, project, retry count, worker index

**afterEach:**
- Logs test result (passed/failed/skipped)
- Logs duration and error message (if failed)
