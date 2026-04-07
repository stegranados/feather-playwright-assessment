import { expect, type Locator, type Page } from '@playwright/test';
import { TestTimeouts } from '../constants';

export class MantineOverlayMixin {
  protected page!: Page;

  get mantine_overlay(): Locator {
    return this.page.locator('.mantine-Modal-overlay');
  }

  /**
   * Dismiss any stray Mantine overlay that might still cover the page.
   * Uses a point-in-time `isVisible()` because by the time this is called
   * the overlay should already exist if present at all.
   */
  async mantine_dismissStrayOverlays(): Promise<void> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (!(await this.mantine_overlay.first().isVisible().catch(() => false))) return;
      await this.page.keyboard.press('Escape');
      await expect(this.mantine_overlay.first()).toBeHidden({
        timeout: TestTimeouts.marketingDialogVisible,
      }).catch(() => undefined);
    }
  }

  /**
   * Dismiss the "Create a campaign" modal if it appears after navigating to
   * Marketing → All.
   *
   * The modal is **optional** — some accounts / sessions never trigger it.
   * We give it a short grace period (`optionalOverlayGrace`) so a slow render
   * doesn't slip past us, but we don't block the happy path when it never
   * appears.
   */
  async mantine_dismissBlockingCreateCampaignModal(): Promise<void> {
    const dialog = this.page.getByRole('dialog', { name: 'Create a campaign' });

    const appeared = await dialog
      .waitFor({ state: 'visible', timeout: TestTimeouts.optionalOverlayGrace })
      .then(() => true)
      .catch(() => false);

    if (!appeared) return;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!(await dialog.isVisible().catch(() => false))) break;

      const closeBtn = dialog.getByRole('button', { name: /^Close$/i });
      if ((await closeBtn.count()) > 0) {
        await closeBtn.first().click({ force: true });
      } else {
        await dialog.getByRole('banner').getByRole('button').first().click({ force: true });
      }

      await expect(dialog).toBeHidden({
        timeout: TestTimeouts.marketingDialogVisible,
      }).catch(() => undefined);

      if (!(await dialog.isVisible().catch(() => false))) break;
      await this.page.keyboard.press('Escape');
    }

    await this.mantine_dismissStrayOverlays();
  }
}
