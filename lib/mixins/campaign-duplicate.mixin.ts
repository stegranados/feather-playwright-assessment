import { expect, type Locator, type Page } from '@playwright/test';
import { TestTimeouts } from '../constants';

type OverlayAwarePage = {
  mantine_dismissStrayOverlays?: () => Promise<void>;
};

export class CampaignDuplicateMixin {
  protected page!: Page;

  campdup_duplicateDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Duplicate Campaign' });
  }

  async campdup_openFromRow(row: Locator): Promise<void> {
    const overlayAwarePage = this as unknown as OverlayAwarePage;
    await overlayAwarePage.mantine_dismissStrayOverlays?.();

    await row.getByRole('button', { name: 'More options' }).click();

    const duplicateMenuItem = this.page.getByRole('menuitem', { name: 'Duplicate' });
    await expect(
      duplicateMenuItem,
      'More options → Duplicate is disabled for this campaign.'
    ).toBeEnabled({ timeout: TestTimeouts.marketingDialogVisible });
    await duplicateMenuItem.click();

    const pixlUpsellDialog = this.page.getByRole('dialog', {
      name: 'Duplicate as Pixl Plus Campaign',
    });
    const duplicateCampaignDialog = this.campdup_duplicateDialog();
    await expect(pixlUpsellDialog.or(duplicateCampaignDialog)).toBeVisible({
      timeout: TestTimeouts.marketingDialogVisible,
    });

    if (await pixlUpsellDialog.isVisible().catch(() => false)) {
      await pixlUpsellDialog
        .getByRole('button', { name: /^Continue with / })
        .first()
        .click();
      await expect(duplicateCampaignDialog).toBeVisible({
        timeout: TestTimeouts.marketingDialogVisible,
      });
    }
  }

  async campdup_expectCloningNotice(): Promise<void> {
    const duplicateCampaignDialog = this.campdup_duplicateDialog();
    await expect(
      duplicateCampaignDialog.getByText('Cloning this campaign will only take a few minutes.')
    ).toBeVisible({ timeout: TestTimeouts.marketingDialogVisible });
    await expect(
      duplicateCampaignDialog.getByText(/notification once it's complete/)
    ).toBeVisible({ timeout: TestTimeouts.marketingDialogVisible });
  }

  async campdup_confirm(): Promise<void> {
    await this.campdup_duplicateDialog().getByRole('button', { name: /^Duplicate$/ }).click();
    await expect(this.campdup_duplicateDialog()).toBeHidden({
      timeout: TestTimeouts.marketingDialogVisible,
    });
  }
}
