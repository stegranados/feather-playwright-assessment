# Adapting the Framework

This guide explains how to adapt the framework for your specific application.

## Step 1: Configure Environment

1. Copy environment template:

```bash
cp .env.example .env
```

2. Update `.env` with your application details:

```
BASE_URL=https://your-app.com
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
TEST_ID_ATTRIBUTE=data-testid  # Or your app's attribute
```

## Step 2: Update Mixin Locators

The example mixins use generic locators. Update them to match your application.

### NavigationMixin

Edit `lib/mixins/navigation.mixin.ts`:

```typescript
// Before (generic)
get nav_homeLink(): Locator {
  return this.page.getByRole('link', { name: /home/i });
}

// After (your app)
get nav_homeLink(): Locator {
  return this.page.getByTestId('nav-home');
  // Or: return this.page.locator('.navbar a[href="/"]');
}
```

### TableMixin

Edit `lib/mixins/table.mixin.ts`:

```typescript
// Before (generic)
get table_container(): Locator {
  return this.page.locator('table, [role="grid"]').first();
}

// After (your app with specific table)
get table_container(): Locator {
  return this.page.getByTestId('data-grid');
}
```

## Step 3: Create Application Page Objects

Replace example page objects with your application's pages.

### Example: Creating a Products Page

1. Create `page-objects/products.page.ts`:

```typescript
import { Page, Locator, expect } from '@playwright/test';
import { applyMixins } from '../lib/core/apply-mixins';
import { NavigationMixin, TableMixin } from '../lib/mixins';

export class ProductsPage {
  constructor(protected page: Page) {}

  // Page-specific locators
  get pageTitle(): Locator {
    return this.page.getByRole('heading', { name: 'Products' });
  }

  get addProductButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Product' });
  }

  get searchInput(): Locator {
    return this.page.getByPlaceholder('Search products...');
  }

  // Page-specific methods
  async navigate(): Promise<void> {
    await this.page.goto('/products');
    await expect(this.pageTitle).toBeVisible();
  }

  async addProduct(): Promise<void> {
    await this.addProductButton.click();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
  }
}

// eslint-disable-next-line no-redeclare
export interface ProductsPage extends NavigationMixin, TableMixin {}
applyMixins(ProductsPage, [NavigationMixin, TableMixin]);
```

2. Add fixture in `lib/fixtures/page-fixtures.ts`:

```typescript
import { ProductsPage } from '../../page-objects/products.page';

interface PageFixtures {
  // ... existing
  productsPage: ProductsPage;
}

export const test = helperFixture.extend<PageFixtures>({
  // ... existing fixtures
  
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
});
```

## Step 4: Create App-Specific Mixins

If your app has unique components, create custom mixins.

### Example: Toast/Notification Mixin

```typescript
// lib/mixins/toast.mixin.ts
import { Page, Locator } from '@playwright/test';

export class ToastMixin {
  protected page!: Page;

  get toast_container(): Locator {
    // Update selector for your app's toast component
    return this.page.locator('.toast-notification');
  }

  get toast_message(): Locator {
    return this.toast_container.locator('.toast-message');
  }

  get toast_closeButton(): Locator {
    return this.toast_container.locator('.toast-close');
  }

  async toast_getMessage(): Promise<string> {
    await this.toast_container.waitFor({ state: 'visible' });
    return (await this.toast_message.textContent()) || '';
  }

  async toast_dismiss(): Promise<void> {
    await this.toast_closeButton.click();
    await this.toast_container.waitFor({ state: 'hidden' });
  }

  async toast_waitForSuccess(): Promise<void> {
    await this.page.locator('.toast-success').waitFor({ state: 'visible' });
  }

  async toast_waitForError(): Promise<void> {
    await this.page.locator('.toast-error').waitFor({ state: 'visible' });
  }
}
```

Export from `lib/mixins/index.ts`:

```typescript
export { ToastMixin } from './toast.mixin';
```

## Step 5: Write Application Tests

Replace example tests with your application tests.

```typescript
// tests/products.spec.ts
import { test, expect } from '../lib/fixtures/page-fixtures';
import { AllureHelper } from '../lib/utils/allure-helper';

test.describe('Products', () => {
  test.beforeEach(async ({ productsPage }) => {
    await productsPage.navigate();
  });

  test('should display products table', async ({ productsPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Products table is visible',
      severity: 'critical',
      feature: 'Products',
    });

    // Using TableMixin
    const rowCount = await productsPage.table_getRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should search products', async ({ productsPage }) => {
    await productsPage.search('Widget');
    
    // Verify filtered results
    const hasWidget = await productsPage.table_hasRowWithText('Widget');
    expect(hasWidget).toBe(true);
  });
});
```

## Handling Different App Architectures

### Single Page Application (SPA)

SPAs often need to wait for dynamic content:

```typescript
async navigate(): Promise<void> {
  await this.page.goto('/dashboard');
  // Wait for SPA to render
  await this.page.waitForLoadState('networkidle');
  await expect(this.pageTitle).toBeVisible();
}
```

### Server-Side Rendered (SSR)

SSR apps may have faster initial loads:

```typescript
async navigate(): Promise<void> {
  await this.page.goto('/dashboard');
  await this.page.waitForLoadState('domcontentloaded');
  await expect(this.pageTitle).toBeVisible();
}
```

### Apps with Authentication

Create an auth setup file:

```typescript
// tests/auth.setup.ts
import { test as setup } from '../lib/fixtures/page-fixtures';

setup('authenticate', async ({ loginPage, page }) => {
  await loginPage.navigate();
  await loginPage.login(
    process.env.TEST_USER_EMAIL!,
    process.env.TEST_USER_PASSWORD!
  );
  
  // Save auth state
  await page.context().storageState({ path: '.auth/user.json' });
});
```

Configure in `playwright.config.ts`:

```typescript
projects: [
  {
    name: 'setup',
    testMatch: /.*\.setup\.ts/,
  },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: '.auth/user.json',
    },
    dependencies: ['setup'],
  },
],
```

## Checklist

- [ ] Environment variables configured
- [ ] NavigationMixin locators updated
- [ ] TableMixin locators updated (if using tables)
- [ ] ModalMixin locators updated (if using modals)
- [ ] FormMixin locators updated (if using forms)
- [ ] Example page objects replaced with app pages
- [ ] App-specific mixins created (if needed)
- [ ] Tests written for main user flows
- [ ] CI secrets configured
