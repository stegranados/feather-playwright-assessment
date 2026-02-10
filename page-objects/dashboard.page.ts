import { Page, Locator, expect } from '@playwright/test';
import { applyMixins } from '../lib/core/apply-mixins';
import { NavigationMixin, TableMixin, ModalMixin } from '../lib/mixins';

/**
 * Dashboard page object.
 * Composes: NavigationMixin, TableMixin, ModalMixin
 */
export class DashboardPage {
  constructor(protected page: Page) {}

  // Page-specific locators

  get dashboardHeading(): Locator {
    return this.page.getByRole('heading', { name: /dashboard/i });
  }

  get welcomeMessage(): Locator {
    return this.page.getByText(/welcome|hello/i);
  }

  get statsWidget(): Locator {
    return this.page.locator('[data-testid="stats-widget"]');
  }

  get recentActivitySection(): Locator {
    return this.page.getByRole('region', { name: /recent activity/i });
  }

  get notificationsBadge(): Locator {
    return this.page.locator('[data-testid="notifications-badge"]');
  }

  get quickActionsPanel(): Locator {
    return this.page.locator('[data-testid="quick-actions"]');
  }

  // Page-specific actions

  async navigate(): Promise<void> {
    await this.page.goto('/dashboard');
    await expect(this.dashboardHeading).toBeVisible();
  }

  async clickStatsWidget(): Promise<void> {
    await this.statsWidget.click();
  }

  // Page-specific data extraction

  async getWelcomeText(): Promise<string> {
    return (await this.welcomeMessage.textContent()) || '';
  }

  async getNotificationCount(): Promise<number> {
    const text = await this.notificationsBadge.textContent();
    const count = parseInt(text?.replace(/\D/g, '') || '0', 10);
    return isNaN(count) ? 0 : count;
  }

  // Page-specific assertions

  async isDashboardVisible(): Promise<boolean> {
    return await this.dashboardHeading.isVisible();
  }

  async isStatsWidgetVisible(): Promise<boolean> {
    return await this.statsWidget.isVisible();
  }

  async waitForDashboardLoad(): Promise<void> {
    await expect(this.dashboardHeading).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }
}

// eslint-disable-next-line no-redeclare
export interface DashboardPage extends NavigationMixin, TableMixin, ModalMixin {}
applyMixins(DashboardPage, [NavigationMixin, TableMixin, ModalMixin]);
