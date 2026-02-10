# Creating and Using Mixins

## Mixin Structure

A mixin is a class that provides reusable functionality:

```typescript
import { Page, Locator } from '@playwright/test';

export class ExampleMixin {
  // Declare page - will be provided by the composed class
  protected page!: Page;

  // Locators as getters (lazy evaluation)
  get example_button(): Locator {
    return this.page.getByRole('button', { name: /example/i });
  }

  // Methods prefixed with mixin name
  async example_click(): Promise<void> {
    await this.example_button.click();
  }

  async example_isVisible(): Promise<boolean> {
    return await this.example_button.isVisible();
  }
}
```

## Naming Conventions

### Prefix Pattern

All mixin members should be prefixed:

| Mixin | Prefix | Example |
|-------|--------|---------|
| NavigationMixin | `nav_` | `nav_clickHome()` |
| TableMixin | `table_` | `table_getRowCount()` |
| ModalMixin | `modal_` | `modal_close()` |
| FormMixin | `form_` | `form_submit()` |

This prevents collisions when multiple mixins are composed.

### Method Categories

Organize methods by purpose:

```typescript
export class TableMixin {
  protected page!: Page;

  // --- Locators ---
  get table_container(): Locator { ... }
  get table_rows(): Locator { ... }

  // --- Actions ---
  async table_clickRow(index: number): Promise<void> { ... }
  async table_sortByColumn(header: string): Promise<void> { ... }

  // --- Data Extraction ---
  async table_getRowCount(): Promise<number> { ... }
  async table_getCellValue(row: number, col: number): Promise<string> { ... }

  // --- Assertions ---
  async table_isEmpty(): Promise<boolean> { ... }
  async table_hasRowWithText(text: string): Promise<boolean> { ... }
}
```

## Composing Page Objects

### Step 1: Create the page class

```typescript
export class MyPage {
  constructor(protected page: Page) {}

  // Page-specific locators and methods
  get pageHeading(): Locator {
    return this.page.getByRole('heading', { name: /my page/i });
  }

  async navigate(): Promise<void> {
    await this.page.goto('/my-page');
  }
}
```

### Step 2: Declare interface extension

```typescript
export interface MyPage extends NavigationMixin, TableMixin {}
```

This tells TypeScript that `MyPage` instances have mixin methods.

### Step 3: Apply mixins

```typescript
applyMixins(MyPage, [NavigationMixin, TableMixin]);
```

### Complete Example

```typescript
import { Page, Locator, expect } from '@playwright/test';
import { applyMixins } from '../lib/core/apply-mixins';
import { NavigationMixin, TableMixin } from '../lib/mixins';

export class MyPage {
  constructor(protected page: Page) {}

  get pageHeading(): Locator {
    return this.page.getByRole('heading', { name: /my page/i });
  }

  async navigate(): Promise<void> {
    await this.page.goto('/my-page');
    await expect(this.pageHeading).toBeVisible();
  }
}

export interface MyPage extends NavigationMixin, TableMixin {}
applyMixins(MyPage, [NavigationMixin, TableMixin]);
```

## Adding to Fixtures

Register the page object in `lib/fixtures/page-fixtures.ts`:

```typescript
import { MyPage } from '../../page-objects/my.page';

interface PageFixtures {
  myPage: MyPage;
  // ... other pages
}

export const test = helperFixture.extend<PageFixtures>({
  myPage: async ({ page }, use) => {
    const myPage = new MyPage(page);
    await use(myPage);
  },
});
```

## Using in Tests

```typescript
import { test, expect } from '../lib/fixtures/page-fixtures';

test('example test', async ({ myPage }) => {
  await myPage.navigate();

  // Page-specific method
  await expect(myPage.pageHeading).toBeVisible();

  // NavigationMixin method
  await myPage.nav_clickSettings();

  // TableMixin method
  const count = await myPage.table_getRowCount();
  expect(count).toBeGreaterThan(0);
});
```

## Creating New Mixins

### 1. Identify shared functionality

Look for patterns repeated across page objects:
- Toast notifications
- Date pickers
- Dropdowns/autocomplete
- File uploads
- Drag and drop

### 2. Create the mixin file

```typescript
// lib/mixins/toast.mixin.ts
import { Page, Locator } from '@playwright/test';

export class ToastMixin {
  protected page!: Page;

  get toast_container(): Locator {
    return this.page.locator('[role="alert"], .toast');
  }

  get toast_message(): Locator {
    return this.toast_container.locator('.toast-message');
  }

  async toast_getMessage(): Promise<string> {
    return (await this.toast_message.textContent()) || '';
  }

  async toast_waitForVisible(timeout?: number): Promise<void> {
    await this.toast_container.waitFor({ state: 'visible', timeout });
  }

  async toast_waitForHidden(timeout?: number): Promise<void> {
    await this.toast_container.waitFor({ state: 'hidden', timeout });
  }

  async toast_dismiss(): Promise<void> {
    const closeButton = this.toast_container.getByRole('button', { name: /close|dismiss/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}
```

### 3. Export from index

```typescript
// lib/mixins/index.ts
export { ToastMixin } from './toast.mixin';
```

### 4. Compose into page objects

```typescript
export interface MyPage extends NavigationMixin, ToastMixin {}
applyMixins(MyPage, [NavigationMixin, ToastMixin]);
```

## API Reference

### NavigationMixin

Navigation bar interactions for pages with a nav component.

**Locators:**

| Locator | Selector |
|---------|----------|
| `nav_homeLink` | `getByRole('link', { name: /home/i })` |
| `nav_profileLink` | `getByRole('link', { name: /profile\|account/i })` |
| `nav_settingsLink` | `getByRole('link', { name: /settings/i })` |
| `nav_logoutButton` | `getByRole('button', { name: /log out\|sign out/i })` |
| `nav_userMenu` | `getByRole('button', { name: /user menu\|account menu/i })` |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `nav_clickHome()` | `Promise<void>` | Click home link |
| `nav_clickProfile()` | `Promise<void>` | Click profile link |
| `nav_clickSettings()` | `Promise<void>` | Click settings link |
| `nav_logout()` | `Promise<void>` | Click logout button |
| `nav_openUserMenu()` | `Promise<void>` | Open user menu dropdown |
| `nav_isHomeVisible()` | `Promise<boolean>` | Check if home link visible |
| `nav_isProfileVisible()` | `Promise<boolean>` | Check if profile link visible |
| `nav_verifyLinksVisible()` | `Promise<boolean>` | Check if all nav links visible |

---

### TableMixin

Data table/grid interactions for pages with tabular data.

**Locators:**

| Locator | Selector |
|---------|----------|
| `table_container` | `locator('table, [role="grid"]').first()` |
| `table_rows` | `locator('tbody tr, [role="row"]')` |
| `table_headers` | `locator('th, [role="columnheader"]')` |
| `table_emptyState` | `getByText(/no data\|no results\|empty/i)` |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `table_clickRow(index)` | `Promise<void>` | Click row by index |
| `table_clickRowByText(text)` | `Promise<void>` | Click row containing text |
| `table_sortByColumn(headerText)` | `Promise<void>` | Click column header to sort |
| `table_getRowCount()` | `Promise<number>` | Get total row count |
| `table_getHeaderTexts()` | `Promise<string[]>` | Get all header texts |
| `table_getCellValue(row, col)` | `Promise<string>` | Get cell value at position |
| `table_getRowData(rowIndex)` | `Promise<string[]>` | Get all cell values in a row |
| `table_isEmpty()` | `Promise<boolean>` | Check if table has no rows |
| `table_hasRowWithText(text)` | `Promise<boolean>` | Check if row with text exists |

---

### ModalMixin

Modal/dialog interactions for pages with modal dialogs.

**Locators:**

| Locator | Selector |
|---------|----------|
| `modal_container` | `locator('[role="dialog"], .modal')` |
| `modal_title` | `locator('[role="heading"], .modal-title, h2')` |
| `modal_closeButton` | `getByRole('button', { name: /close\|×\|x/i })` |
| `modal_confirmButton` | `getByRole('button', { name: /confirm\|ok\|yes\|submit\|save/i })` |
| `modal_cancelButton` | `getByRole('button', { name: /cancel\|no\|close/i })` |
| `modal_overlay` | `locator('.modal-overlay')` |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `modal_close()` | `Promise<void>` | Click close button |
| `modal_confirm()` | `Promise<void>` | Click confirm button |
| `modal_cancel()` | `Promise<void>` | Click cancel button |
| `modal_clickOutside()` | `Promise<void>` | Click overlay to close |
| `modal_isOpen()` | `Promise<boolean>` | Check if modal visible |
| `modal_isClosed()` | `Promise<boolean>` | Check if modal hidden |
| `modal_getTitle()` | `Promise<string>` | Get modal title text |
| `modal_waitForOpen(timeout?)` | `Promise<void>` | Wait for modal to appear |
| `modal_waitForClose(timeout?)` | `Promise<void>` | Wait for modal to close |

---

### FormMixin

Form field interactions for pages with form inputs.

**Locators:**

| Locator | Selector |
|---------|----------|
| `form_container` | `locator('form').first()` |
| `form_submitButton` | `getByRole('button', { name: /submit\|save\|send\|continue/i })` |
| `form_resetButton` | `getByRole('button', { name: /reset\|clear/i })` |
| `form_validationErrors` | `locator('[class*="error"], [role="alert"]')` |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `form_fillField(name, value)` | `Promise<void>` | Fill textbox by label |
| `form_fillEmail(value)` | `Promise<void>` | Fill email field |
| `form_fillPassword(value)` | `Promise<void>` | Fill password field |
| `form_selectOption(label, value)` | `Promise<void>` | Select dropdown option |
| `form_checkBox(label)` | `Promise<void>` | Check checkbox by label |
| `form_uncheckBox(label)` | `Promise<void>` | Uncheck checkbox by label |
| `form_selectRadio(label)` | `Promise<void>` | Select radio by label |
| `form_submit()` | `Promise<void>` | Click submit button |
| `form_reset()` | `Promise<void>` | Click reset button |
| `form_pressEnter()` | `Promise<void>` | Press Enter key |
| `form_getValidationErrors()` | `Promise<string[]>` | Get all error messages |
| `form_hasValidationErrors()` | `Promise<boolean>` | Check if errors exist |
| `form_getFieldValue(name)` | `Promise<string>` | Get field value by label |
