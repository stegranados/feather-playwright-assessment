# Allure Reporting

This framework includes Allure integration for rich test reporting.

## Generating Reports

```bash
# Generate report from results
npm run allure:generate

# Open report in browser
npm run allure:open

# Generate and serve in one command
npm run allure:serve
```

## AllureHelper API

The `AllureHelper` class in `lib/utils/allure-helper.ts` provides utilities for test metadata and attachments.

### Test Metadata

```typescript
import { AllureHelper } from '../lib/utils/allure-helper';

test('user login', async ({ loginPage }) => {
  await AllureHelper.applyTestMetadata({
    displayName: 'User can login with valid credentials',
    description: 'Verifies the login flow for authenticated users',
    tags: ['smoke', 'auth'],
    severity: 'critical',
    epic: 'Authentication',
    feature: 'Login',
    story: 'User Login',
    owner: 'QA Team',
  });

  // Test code...
});
```

### Metadata Fields

| Field | Description | Example |
|-------|-------------|---------|
| `displayName` | Test name in report | `'User can login'` |
| `description` | Detailed description | `'Verifies login flow...'` |
| `tags` | Test tags/labels | `['smoke', 'regression']` |
| `severity` | Test severity level | `'critical'`, `'normal'`, `'minor'` |
| `epic` | High-level feature area | `'Authentication'` |
| `feature` | Feature being tested | `'Login'` |
| `story` | User story | `'User Login'` |
| `owner` | Test owner/team | `'QA Team'` |

### Severity Levels

| Level | Use Case |
|-------|----------|
| `blocker` | Blocks all testing |
| `critical` | Core functionality |
| `normal` | Standard features |
| `minor` | Edge cases |
| `trivial` | Cosmetic issues |

## Attachments

### Screenshot

```typescript
const screenshot = await page.screenshot();
await AllureHelper.attachScreenshot('Login page', screenshot);
```

### Text

```typescript
await AllureHelper.attachText('API Response', responseBody);
```

### JSON

```typescript
await AllureHelper.attachJson('Request payload', { 
  email: 'test@example.com',
  timestamp: Date.now() 
});
```

## Steps

Wrap actions in Allure steps for better reporting:

```typescript
test('checkout flow', async ({ page }) => {
  await AllureHelper.step('Add item to cart', async () => {
    await page.click('[data-testid="add-to-cart"]');
  });

  await AllureHelper.step('Proceed to checkout', async () => {
    await page.click('[data-testid="checkout"]');
  });

  await AllureHelper.step('Complete payment', async () => {
    await page.fill('#card-number', '4111111111111111');
    await page.click('[data-testid="pay"]');
  });
});
```

## Linking Issues and Test Cases

### Link to Issue

```typescript
await AllureHelper.addIssue('JIRA-123');
```

### Link to Test Case

```typescript
await AllureHelper.addTestCase('TC-456');
```

### Custom Link

```typescript
await AllureHelper.addLink(
  'https://example.com/docs',
  'Documentation',
  'doc'
);
```

## Complete Example

```typescript
import { test, expect } from '../lib/fixtures/page-fixtures';
import { AllureHelper } from '../lib/utils/allure-helper';

test('user completes purchase', async ({ dashboardPage, page }) => {
  // Metadata
  await AllureHelper.applyTestMetadata({
    displayName: 'User completes purchase flow',
    severity: 'critical',
    epic: 'E-Commerce',
    feature: 'Checkout',
    story: 'Purchase Flow',
    tags: ['smoke', 'checkout'],
  });

  // Link to test management
  await AllureHelper.addTestCase('TC-100');
  await AllureHelper.addIssue('JIRA-200');

  // Steps with attachments
  await AllureHelper.step('Navigate to product', async () => {
    await dashboardPage.navigate();
    const screenshot = await page.screenshot();
    await AllureHelper.attachScreenshot('Dashboard', screenshot);
  });

  await AllureHelper.step('Add to cart', async () => {
    await page.click('[data-testid="add-to-cart"]');
  });

  await AllureHelper.step('Verify cart', async () => {
    await expect(page.locator('.cart-count')).toHaveText('1');
  });
});
```

## Report Structure

Allure organizes tests by:

```
Epic
└── Feature
    └── Story
        └── Test Cases
```

Example:

```
Authentication (Epic)
└── Login (Feature)
    └── User Login (Story)
        ├── User can login with valid credentials
        ├── User sees error with invalid credentials
        └── User can reset password
```

## Auto-Captured Artifacts

The framework automatically captures on test failure:
- Screenshot
- Console logs
- Browser version

These appear in Allure without manual code.

## Environment Information

Add environment info to reports by creating `allure-results/environment.properties`:

```properties
Browser=Chromium
Environment=Staging
URL=https://staging.example.com
```

## Categories

Define failure categories in `allure-results/categories.json`:

```json
[
  {
    "name": "Element not found",
    "matchedStatuses": ["failed"],
    "messageRegex": ".*locator.*"
  },
  {
    "name": "Timeout",
    "matchedStatuses": ["failed"],
    "messageRegex": ".*timeout.*"
  }
]
```
