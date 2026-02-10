# Architecture Overview

This framework uses the Mixin Design Pattern to favor composition over inheritance.

## The Problem with Traditional Inheritance

```
BasePage (15+ methods)
    ↓
NavPage extends BasePage
    ↓
TablePage extends NavPage
    ↓
DashboardPage extends TablePage
```

Issues:
- Single inheritance limits flexibility
- BasePage becomes a "God Object"
- Deep chains are fragile and hard to maintain
- Can't mix behaviors from unrelated hierarchies

## The Composition Solution

```
NavigationMixin ──┐
TableMixin ───────┼──→ DashboardPage
ModalMixin ───────┘

NavigationMixin ──┬──→ ReportsPage
TableMixin ───────┘

FormMixin ────────────→ LoginPage
```

Each page object composes only the mixins it needs.

## Core Components

### 1. apply-mixins.ts

The engine that copies mixin prototype methods to target classes:

```typescript
export function applyMixins(
  derivedCtor: any,
  constructors: any[],
  options?: { debug?: boolean }
): void
```

Also maintains `MixinRegistry` for debugging/introspection.

### 2. Mixins

Small, focused classes with:
- `protected page!: Page` declaration (provided by target class)
- Getter-based locators (lazy evaluation)
- Prefixed methods (`nav_`, `table_`, etc.)

### 3. Page Objects

Composed classes that:
- Define page-specific locators and methods
- Declare interface extension for TypeScript
- Call `applyMixins` at module load

### 4. Fixtures

Playwright fixtures that inject composed page objects into tests.

## Data Flow

```
Test File
    ↓
page-fixtures.ts (creates page object instances)
    ↓
Page Object (e.g., DashboardPage)
    ↓
applyMixins() at module load copies mixin methods
    ↓
Test can call both page-specific and mixin methods
```

## File Organization

```
lib/
├── core/
│   ├── apply-mixins.ts    # Mixin engine
│   ├── base-component.ts  # Minimal base (optional)
│   └── types.ts           # Shared types
├── mixins/
│   ├── navigation.mixin.ts
│   ├── table.mixin.ts
│   ├── modal.mixin.ts
│   ├── form.mixin.ts
│   └── index.ts           # Barrel export
├── fixtures/
│   ├── helper-fixtures.ts # Auto fixtures
│   └── page-fixtures.ts   # Page object injection
└── utils/
    ├── logger.ts
    ├── allure-helper.ts
    └── debug-utils.ts
```

## Key Design Decisions

### Prefix Convention

All mixin members are prefixed:
- `nav_clickHome()` - from NavigationMixin
- `table_getRowCount()` - from TableMixin
- `modal_close()` - from ModalMixin

This prevents collisions and makes method origin obvious.

### Getter-Based Locators

Mixins use getters instead of constructor initialization:

```typescript
// Good: Lazy evaluation, no constructor needed
get nav_homeLink(): Locator {
  return this.page.getByRole('link', { name: /home/i });
}

// Avoid: Requires constructor logic
constructor() {
  this.homeLink = this.page.getByRole('link', { name: /home/i });
}
```

### Minimal BaseComponent

The optional `BaseComponent` contains only truly universal concerns:
- `page` reference
- `defaultTimeout`

Everything else goes in mixins.

## Trade-offs and Considerations

### TypeScript `any` Usage

The mixin engine (`apply-mixins.ts`), shared types (`types.ts`), and debug utilities use `any` in several places. This is intentional and will trigger ESLint warnings (`@typescript-eslint/no-explicit-any`).

**Why it's necessary:**
- `applyMixins` must accept arbitrary class constructors at runtime
- TypeScript has no built-in type for "any class constructor"
- Using stricter types would require complex generics that still don't cover all mixin use cases

**Where it appears:**
- `applyMixins(derivedCtor: any, constructors: any[]): void`
- `Constructor<T = object>` type with `...args: any[]`
- `inspectPageObject(instance: any)` and `getMethodsByPrefix(instance: any)` in debug-utils

**Recommendation:** Leave these as-is. The trade-off (reduced type safety in the engine) is acceptable for the flexibility gained. Application code (page objects, mixins, tests) remains fully typed.

### Interface Declaration Merging

Page objects use `export interface MyPage extends SomeMixin {}` to merge mixin types. ESLint may flag this as `no-redeclare` because the interface has the same name as the class. This is valid TypeScript declaration merging and is required for IntelliSense on mixin methods. Use `eslint-disable-next-line no-redeclare` on those lines.

### Method Name Collisions

If two mixins define the same method name, the last one applied wins. The prefix convention (`nav_`, `table_`, etc.) mitigates this. Enable `{ debug: true }` in `applyMixins` to surface collision warnings during development.
