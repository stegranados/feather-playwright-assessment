import { expect, type Locator, type Page } from '@playwright/test';
import { SETTINGS_BILLING_CONFIGURATIONS_PATH } from '../lib/constants/settings-urls';

/**
 * Settings → Billing → Configurations: primary vs additional billing rows.
 * Full add / payment / “set as primary” flows depend on product flags; use
 * {@link isBillingConfigurationManagementEnabled} before driving those paths.
 */
export class BillingConfigurationsPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto(`/${SETTINGS_BILLING_CONFIGURATIONS_PATH}`);
    await this.expectListingLoaded();
  }

  async expectListingLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`${SETTINGS_BILLING_CONFIGURATIONS_PATH.replace(/\//g, '\\/')}\\/?$`),
    );
    await expect(
      this.page.getByRole('heading', { name: 'Primary Billing Configuration' }),
    ).toBeVisible();
    await expect(
      this.page.getByRole('heading', { name: 'Additional Billing Configurations' }),
    ).toBeVisible();
  }

  /**
   * When `false`, **Add billing configuration** and per-row **Update** are disabled
   * (e.g. “Update to our billing system” notice on staging).
   */
  async isBillingConfigurationManagementEnabled(): Promise<boolean> {
    const add = this.page.getByRole('button', { name: 'Add billing configuration' });
    return add.isEnabled();
  }

  /**
   * Scope: the primary block directly under `main` (heading + empty state or primary card).
   * It must not expose **Delete**; additional rows keep **Delete** until promoted.
   */
  private primaryBillingBlock(): Locator {
    return this.page
      .getByRole('heading', { name: 'Primary Billing Configuration' })
      .locator('..')
      .locator('..');
  }

  async expectPrimarySectionHasNoDeleteButton(): Promise<void> {
    await expect(this.primaryBillingBlock().getByRole('button', { name: 'Delete' })).toHaveCount(0);
  }

  /** First card under **Additional Billing Configurations** (smoke for row actions). */
  async expectFirstAdditionalConfigurationHasDelete(): Promise<void> {
    const list = this.page.locator('main').getByRole('list').first();
    const firstItem = list.getByRole('listitem').first();
    await expect(firstItem.getByRole('button', { name: 'Delete' })).toBeVisible();
  }

  /** Row in **Additional Billing Configurations** matching card title / billing info text. */
  additionalConfigurationRow(name: string): Locator {
    return this.page.locator('main').getByRole('listitem').filter({ hasText: name });
  }
}
