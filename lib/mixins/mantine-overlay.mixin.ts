import { expect, type Locator, type Page } from '@playwright/test';
import { TestTimeouts } from '../constants';

export class MantineOverlayMixin {
  protected page!: Page;

  get mantine_overlay(): Locator {
    return this.page.locator('.mantine-Modal-overlay');
  }

  async mantine_dismissStrayOverlays(): Promise<void> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const overlayIsVisible = await this.mantine_overlay.first().isVisible().catch(() => false);
      if (!overlayIsVisible) {
        return;
      }

      await this.page.keyboard.press('Escape');
      await expect(this.mantine_overlay.first()).toBeHidden({
        timeout: TestTimeouts.marketingDialogVisible,
      }).catch(() => undefined);
    }
  }

  async mantine_dismissBlockingCreateCampaignModal(): Promise<void> {
    const createCampaignDialog = this.page.getByRole('dialog', { name: 'Create a campaign' });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!(await createCampaignDialog.isVisible().catch(() => false))) {
        break;
      }

      const namedCloseButton = createCampaignDialog.getByRole('button', { name: /^Close$/i });
      if ((await namedCloseButton.count()) > 0) {
        await namedCloseButton.first().click({ force: true });
      } else {
        await createCampaignDialog.getByRole('banner').getByRole('button').first().click({ force: true });
      }

      await expect(createCampaignDialog).toBeHidden({
        timeout: TestTimeouts.marketingDialogVisible,
      }).catch(() => undefined);

      if (!(await createCampaignDialog.isVisible().catch(() => false))) {
        break;
      }

      await this.page.keyboard.press('Escape');
    }

    await this.mantine_dismissStrayOverlays();
  }
}
