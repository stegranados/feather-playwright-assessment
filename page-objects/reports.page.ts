import { Page, Locator, expect } from '@playwright/test';
import { applyMixins } from '../lib/core/apply-mixins';
import { NavigationMixin, TableMixin } from '../lib/mixins';

/**
 * Reports page object.
 * Composes: NavigationMixin, TableMixin
 */
export class ReportsPage {
  constructor(protected page: Page) {}

  // Page-specific locators

  get reportsHeading(): Locator {
    return this.page.getByRole('heading', { name: /reports/i });
  }

  get dateRangeFilter(): Locator {
    return this.page.locator('[data-testid="date-range-filter"]');
  }

  get exportButton(): Locator {
    return this.page.getByRole('button', { name: /export/i });
  }

  get refreshButton(): Locator {
    return this.page.getByRole('button', { name: /refresh/i });
  }

  get searchInput(): Locator {
    return this.page.getByRole('textbox', { name: /search/i });
  }

  get loadingIndicator(): Locator {
    return this.page.locator('[data-testid="loading"]');
  }

  // Page-specific actions

  async navigate(): Promise<void> {
    await this.page.goto('/reports');
    await expect(this.reportsHeading).toBeVisible();
  }

  async exportData(): Promise<void> {
    await this.exportButton.click();
  }

  async refreshData(): Promise<void> {
    await this.refreshButton.click();
    await this.waitForDataLoad();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.waitForDataLoad();
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.keyboard.press('Enter');
  }

  // Page-specific waits

  async waitForDataLoad(): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
  }

  async waitForReportsLoad(): Promise<void> {
    await expect(this.reportsHeading).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  // Page-specific assertions

  async isExportEnabled(): Promise<boolean> {
    return await this.exportButton.isEnabled();
  }
}

// eslint-disable-next-line no-redeclare
export interface ReportsPage extends NavigationMixin, TableMixin {}
applyMixins(ReportsPage, [NavigationMixin, TableMixin]);
