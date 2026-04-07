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

    // Temporary fallback until the list popup exposes stable role semantics.
    const menuList = this.page.locator('[class*="MenuList"], [class*="menu-list"]').last();
    await expect(menuList).toBeVisible({ timeout: TestTimeouts.marketingDialogVisible });
    await menuList.getByText(value, { exact: true }).click();
  }

  async mktfilter_selectTypeIfPresent(typeLabel: string): Promise<boolean> {
    const dialog = this.mktfilter_dialog();
    await dialog.getByRole('textbox', { name: 'Type' }).click({ force: true });

    const menuList = this.page.locator('[class*="MenuList"], [class*="menu-list"]').last();
    await expect(menuList).toBeVisible({ timeout: TestTimeouts.marketingDialogVisible });

    const typeOption = menuList.getByText(typeLabel, { exact: true });
    const hasTypeOption = (await typeOption.count()) > 0;
    if (!hasTypeOption) {
      await this.page.keyboard.press('Escape');
      return false;
    }

    await typeOption.click();
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
