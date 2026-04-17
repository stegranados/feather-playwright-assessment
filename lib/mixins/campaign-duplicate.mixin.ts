import { expect, type Locator, type Page } from '@playwright/test';
import { TestTimeouts } from '../constants';

type OverlayAwarePage = {
  mantine_dismissStrayOverlays?: () => Promise<void>;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TYPES_WITH_CONTINUE_PROMPT = new Set(['Retargeting', 'Email Mapping']);

export class CampaignDuplicateMixin {
  protected page!: Page;

  campdup_duplicateDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Duplicate Campaign' });
  }

  campaign_moreOptionsButton(): Locator {
    return this.page.getByRole('button', { name: 'More options' });
  }

  campaign_duplicateMenuItem(): Locator {
    return this.page.getByRole('menuitem', { name: 'Duplicate' })
  }

  campaign_duplicateButton(): Locator {
    return this.page.getByRole('button', { name: 'Duplicate' })
  }

  campdup_continueWithButton(campaignType: string): Locator {
    return this.page.getByRole('button', { name: `Continue with ${campaignType}` });
  }

  campdup_cloneStartedNotice(sourceCampaignName: string): Locator {
    const escapedCampaignName = escapeRegExp(sourceCampaignName.trim());
    return this.page.getByText(new RegExp(`Campaign "${escapedCampaignName}[^"]*" is`, 'i'));
  }

  /**
   * Some campaign types (e.g. Retargeting, Email Mapping) show a "Continue with
   * {Type}" prompt after clicking Duplicate and before the standard Duplicate
   * Campaign dialog. For any other type this is a no-op.
   *
   * To support a new type, add it to `TYPES_WITH_CONTINUE_PROMPT`.
   */
  async campdup_handleContinuePrompt(campaignType: string): Promise<void> {
    if (!TYPES_WITH_CONTINUE_PROMPT.has(campaignType)) return;

    const continueBtn = this.campdup_continueWithButton(campaignType);
    await expect(continueBtn).toBeVisible({
      timeout: TestTimeouts.marketingDialogVisible,
    });
    await continueBtn.click();
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

  async campdup_expectCloneStartedNotice(sourceCampaignName: string): Promise<void> {
    await expect(this.campdup_cloneStartedNotice(sourceCampaignName)).toBeVisible({
      timeout: TestTimeouts.marketingDialogVisible,
    });
  }
}
