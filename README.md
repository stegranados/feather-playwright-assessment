# Playwright Composition Reference

A Playwright automation framework using the **Mixin Design Pattern** for composition over inheritance. This approach creates modular, reusable "feature packs" that can be mixed into any page object.

## Why Composition Over Inheritance?

Traditional inheritance (`class A extends B`) has limits:
- A class can only extend one other class
- Leads to deep, rigid inheritance chains
- Forces shared behavior into bloated base classes

The Mixin pattern solves this by letting you compose page objects from multiple focused feature packs.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium --with-deps

# Optional: Install all browsers for parallel execution
npx playwright install chromium msedge firefox webkit --with-deps
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your application's configuration
```

### Running Tests

```bash
# Run all tests
npm test

# Run with UI mode
npm run test:ui

# Run in headed mode
npm run test:headed

# Run on specific browser
npm run test:smoke-chrome
npm run test:smoke-firefox
```

## Project Structure

```
playwright-composition-reference/
├── lib/
│   ├── core/              # Mixin engine and base component
│   ├── mixins/            # Reusable feature packs
│   ├── fixtures/          # Playwright fixtures
│   └── utils/             # Logging, Allure, debug utilities
├── page-objects/          # Composed page objects
├── tests/                 # Test specifications
├── data/                  # Test data
└── docs/                  # Documentation
```

## Core Concepts

### Mixins

Reusable classes focused on single functionality:

| Mixin | Prefix | Purpose |
|-------|--------|---------|
| NavigationMixin | `nav_` | Navigation bar interactions |
| TableMixin | `table_` | Data table/grid handling |
| ModalMixin | `modal_` | Modal/dialog interactions |
| FormMixin | `form_` | Form field utilities |

### Composing Page Objects

```typescript
import { applyMixins } from '../lib/core/apply-mixins';
import { FormMixin } from '../lib/mixins';

export class LoginPage {
  constructor(protected readonly page: Page) {}
  // Page-specific locators and actions
}

export interface LoginPage extends FormMixin {}
applyMixins(LoginPage, [FormMixin]);
```

### Using in Tests

```typescript
test('shows login UI', async ({ loginPage }) => {
  await loginPage.navigate();
  await expect(loginPage.btnLogIn).toBeVisible();
});
```

## Documentation

### Core

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Creating Mixins](docs/MIXINS.md)
- [Debugging Guide](docs/DEBUGGING.md)

### Framework

- [Fixtures](docs/FIXTURES.md)
- [Configuration](docs/CONFIGURATION.md)
- [Allure Reporting](docs/ALLURE.md)
- [CI/CD Integration](docs/CICD.md)

### Getting Started

- [Adapting to Your App](docs/ADAPTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests |
| `npm run test:ui` | Run with UI mode |
| `npm run test:headed` | Run in headed mode |
| `npm run test:debug` | Run with debugger |
| `npm run allure:generate` | Generate Allure report |
| `npm run allure:open` | Open Allure report |
| `npm run lint` | Run ESLint |

## Reporting

### Allure Reports

```bash
npm run allure:generate
npm run allure:open
```

### Playwright HTML Report

```bash
npx playwright show-report
```

## Credits

The mixin pattern implementation is based on established TypeScript patterns ([TypeScript Handbook](https://typescriptlang.org/docs/handbook/mixins.html)) and the approach described in [Ivan Davidov's article](https://idavidov.eu/upgrade-playwright-tests-typescript-mixin-design-pattern-guide) and [Mixin-Design-Pattern repository](https://github.com/idavidov13/Mixin-Design-Pattern). This project extends that foundation with a full framework: multiple ready-to-use mixins, prefix conventions, debug tooling, Allure reporting, and production fixtures.

## License

ISC
