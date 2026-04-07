import { expect, type Locator, type Page } from '@playwright/test';
import { TestTimeouts } from '../constants';

export class MarketingFiltersMixin {
  protected page!: Page;

  mkfilter_campaignNameSearchBar(): Locator {
    return this.page.getByRole('textbox', { name: 'Search by name...' });
  }

  mktfilter_dialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Filters' });
  }

  async mktfilter_openDialog(): Promise<void> {
    await this.page.getByRole('button', { name: 'Filters' }).click();
    await expect(this.mktfilter_dialog()).toBeVisible({ timeout: TestTimeouts.marketingDialogVisible });
  }

  async mktfilter_clearIfVisible(): Promise<void> {
    const clearButton = this.mktfilter_dialog().getByRole('button', { name: /^Clear/i });
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
    }
  }

  async mktfilter_pickComboboxValue(fieldLabel: 'Status' | 'Type', value: string): Promise<void> {
    const dialog = this.mktfilter_dialog();
    await dialog.getByRole('textbox', { name: fieldLabel }).click({ force: true });

    const option = this.page.getByRole('option', { name: value, exact: true }).first();
    const menuList = this.page.locator('[class*="MenuList"], [class*="menu-list"]').last();

    // Auto-retry until EITHER the semantic option OR the CSS-class menu is visible.
    await expect(option.or(menuList)).toBeVisible({ timeout: TestTimeouts.marketingDialogVisible });

    // Prefer the semantic option when it materialized.
    if ((await option.isVisible().catch(() => false))) {
      await option.scrollIntoViewIfNeeded();
      await option.click();
      return;
    }

    // Fallback: the CSS-class menu appeared — pick by text inside it.
    const choice = menuList.getByText(value, { exact: true }).first();
    await choice.scrollIntoViewIfNeeded();
    await choice.click();
  }

  /** Pick a campaign type in the Filters dialog (dialog must already be open). */
  async mktfilter_pickCampaignType(typeKey: string): Promise<void> {
    await this.mktfilter_pickComboboxValue('Type', typeKey);
  }

  async mktfilter_selectTypeIfPresent(typeLabel: string): Promise<boolean> {
    const dialog = this.mktfilter_dialog();
    await dialog.getByRole('textbox', { name: 'Type' }).click({ force: true });

    const option = this.page.getByRole('option', { name: typeLabel, exact: true }).first();
    const menuList = this.page.locator('[class*="MenuList"], [class*="menu-list"]').last();

    await expect(option.or(menuList)).toBeVisible({ timeout: TestTimeouts.marketingDialogVisible });

    if (await option.isVisible().catch(() => false)) {
      await option.scrollIntoViewIfNeeded();
      await option.click();
      return true;
    }

    const typeOption = menuList.getByText(typeLabel, { exact: true });
    if ((await typeOption.count()) === 0) {
      await this.page.keyboard.press('Escape');
      return false;
    }

    await typeOption.first().scrollIntoViewIfNeeded();
    await typeOption.first().click();
    return true;
  }

  async mktfilter_apply(): Promise<void> {
    await this.mktfilter_dialog().getByRole('button', { name: 'Apply' }).click();
    await expect(this.mktfilter_dialog()).toBeHidden({ timeout: TestTimeouts.marketingDialogVisible });
  }

  async mktfilter_closeWithoutApply(): Promise<void> {
    await this.mktfilter_dialog().getByRole('banner').getByRole('button').first().click();
    await expect(this.mktfilter_dialog()).toBeHidden({ timeout: TestTimeouts.marketingDialogVisible });
  }
}
