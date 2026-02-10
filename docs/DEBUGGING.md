# Debugging Mixins

## Identifying Method Origins

### Prefix Convention

The prefix on each method indicates its source:

```typescript
await dashboardPage.nav_clickHome();    // NavigationMixin
await dashboardPage.table_getRowCount(); // TableMixin
await dashboardPage.modal_close();       // ModalMixin
await dashboardPage.navigate();          // DashboardPage (no prefix)
```

### Debug Utilities

Use `inspectPageObject` to log all available methods:

```typescript
import { inspectPageObject } from '../lib/utils/debug-utils';

test('debug page object', async ({ dashboardPage }) => {
  inspectPageObject(dashboardPage);
});
```

Output:
```
[DashboardPage]
  Mixins: [NavigationMixin, TableMixin, ModalMixin]
  Methods:
    - navigate (page)
    - isDashboardVisible (page)
    - nav_clickHome (nav)
    - nav_clickProfile (nav)
    - table_getRowCount (table)
    - modal_close (modal)
```

### Checking Mixin Application

```typescript
import { getMixinsFor, hasMixin } from '../lib/utils/debug-utils';

// Get all mixins for a class
const mixins = getMixinsFor('DashboardPage');
// ['NavigationMixin', 'TableMixin', 'ModalMixin']

// Check if specific mixin is applied
const hasNav = hasMixin('DashboardPage', 'NavigationMixin');
// true
```

## Collision Detection

Enable debug mode to see collision warnings:

```typescript
applyMixins(MyPage, [MixinA, MixinB], { debug: true });
```

If both mixins define `clickSubmit()`:
```
[Mixin Collision] "clickSubmit" in MyPage will be overwritten by MixinB
```

## Breakpoint Debugging

### Step Into Mixin Methods

1. Set a breakpoint on the mixin method call:
   ```typescript
   await dashboardPage.nav_clickHome(); // breakpoint here
   ```

2. Use "Step Into" (F11 in VS Code)

3. Debugger will navigate to `navigation.mixin.ts`

### Source Maps

Ensure source maps are enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

## Common Issues

### "Method not found" at runtime

**Cause**: `applyMixins` not called or called incorrectly.

**Fix**: Ensure the call is at module level, after class definition:

```typescript
export class MyPage { ... }
export interface MyPage extends SomeMixin {}
applyMixins(MyPage, [SomeMixin]); // Must be after class
```

### TypeScript errors on mixin methods

**Cause**: Interface declaration missing.

**Fix**: Add the interface merge:

```typescript
export interface MyPage extends NavigationMixin, TableMixin {}
```

### Method collision

**Cause**: Two mixins define the same method name.

**Solutions**:
1. Use prefixes consistently (`nav_`, `table_`)
2. Rename one of the methods
3. Apply mixins in specific order (last wins)

### Locator not working in mixin

**Cause**: `page` property not available.

**Fix**: Ensure the composed class has `protected page: Page` in constructor:

```typescript
export class MyPage {
  constructor(protected page: Page) {} // Required
}
```

## Logging

### Enable Debug Logging

Set in `.env`:
```
LOG_LEVEL=debug
```

### Add Custom Logs

```typescript
import logger from '../lib/utils/logger';

const log = logger({ filename: __filename });

async nav_clickHome(): Promise<void> {
  log.debug('Clicking home link');
  await this.nav_homeLink.click();
}
```

## Test Failure Artifacts

On test failure, the framework automatically captures:
- Console logs (`logs.txt`)
- Screenshot
- Browser version

These attach to both Playwright and Allure reports.

## Allure Step Tracking

Wrap mixin methods in Allure steps for better reporting:

```typescript
import { AllureHelper } from '../lib/utils/allure-helper';

async nav_clickHome(): Promise<void> {
  await AllureHelper.step('Click home link', async () => {
    await this.nav_homeLink.click();
  });
}
```
