# Configuration

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Application URL for tests |
| `TEST_USER_EMAIL` | - | Test user email for authentication |
| `TEST_USER_PASSWORD` | - | Test user password for authentication |
| `TEST_ID_ATTRIBUTE` | `data-testid` | Custom test ID attribute name |
| `TIMEZONE` | `America/Los_Angeles` | Browser timezone |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

## Playwright Configuration

Configuration is in `playwright.config.ts`.

### Timeouts

| Setting | Value | Description |
|---------|-------|-------------|
| `timeout` | 5 minutes | Overall test timeout |
| `expect.timeout` | 15 seconds | Assertion timeout |
| `actionTimeout` | 15 seconds | Click, fill, etc. timeout |
| `navigationTimeout` | 30 seconds | Page navigation timeout |

### Reporters

Three reporters are configured:

```typescript
reporter: [
  ['html', { open: 'never' }],           // Playwright HTML report
  ['allure-playwright', { outputFolder: 'allure-results' }],  // Allure
  ['list'],                               // Console output
],
```

### Artifacts

| Setting | Value | Description |
|---------|-------|-------------|
| `trace` | `on-first-retry` | Capture trace on retry |
| `screenshot` | `only-on-failure` | Screenshot on failure |
| `video` | `on-first-retry` | Record video on retry |

### Browser Projects

Four browser projects are configured:

| Project | Browser |
|---------|---------|
| `chromium` | Google Chrome |
| `firefox` | Mozilla Firefox |
| `webkit` | Safari |
| `msedge` | Microsoft Edge |

Run specific browser:

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
```

## CI vs Local Behavior

| Setting | Local | CI (`process.env.CI`) |
|---------|-------|------|
| `forbidOnly` | false | true (fails if `.only` exists) |
| `retries` | 0 | 2 |
| `workers` | auto | 1 |

## Customizing Test ID Attribute

If your application uses a custom test ID attribute (e.g., `data-cy`, `data-test`):

1. Set in `.env`:

```
TEST_ID_ATTRIBUTE=data-cy
```

2. Use in locators:

```typescript
// With data-testid="submit-button"
page.getByTestId('submit-button')

// Works with whatever TEST_ID_ATTRIBUTE is set to
```

## Adjusting Timeouts

### For Slow Networks

```typescript
// In playwright.config.ts
use: {
  actionTimeout: 30000,      // 30 seconds
  navigationTimeout: 60000,  // 60 seconds
},
```

### For Specific Tests

```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);  // 10 minutes for this test
  // ...
});
```

### For Specific Actions

```typescript
await page.click('button', { timeout: 30000 });
await expect(locator).toBeVisible({ timeout: 30000 });
```

## Adding a New Browser Project

```typescript
// In playwright.config.ts
projects: [
  // ... existing projects
  {
    name: 'mobile-chrome',
    use: { ...devices['Pixel 5'] },
  },
  {
    name: 'mobile-safari',
    use: { ...devices['iPhone 12'] },
  },
],
```

## Parallel Execution

### Local

```bash
# Use all available workers
npx playwright test

# Limit workers
npx playwright test --workers=4
```

### Configuration

```typescript
// In playwright.config.ts
fullyParallel: true,  // Run tests in parallel
workers: process.env.CI ? 1 : undefined,  // Auto in local, 1 in CI
```

## Output Directories

| Directory | Content |
|-----------|---------|
| `test-results/` | Test artifacts (screenshots, videos, traces) |
| `playwright-report/` | HTML report |
| `allure-results/` | Allure raw results |
| `allure-report/` | Generated Allure report |
