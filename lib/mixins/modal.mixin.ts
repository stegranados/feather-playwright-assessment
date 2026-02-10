import { Page, Locator } from '@playwright/test';

/**
 * Provides modal/dialog interactions.
 * Apply to any page that uses modal dialogs.
 */
export class ModalMixin {
  protected page!: Page;

  // Locators

  get modal_container(): Locator {
    return this.page.locator('[role="dialog"], .modal, [data-testid="modal"]').first();
  }

  get modal_title(): Locator {
    return this.modal_container.locator('[role="heading"], .modal-title, h2').first();
  }

  get modal_closeButton(): Locator {
    return this.modal_container.getByRole('button', { name: /close|×|x/i });
  }

  get modal_confirmButton(): Locator {
    return this.modal_container.getByRole('button', { name: /confirm|ok|yes|submit|save/i });
  }

  get modal_cancelButton(): Locator {
    return this.modal_container.getByRole('button', { name: /cancel|no|close/i });
  }

  get modal_overlay(): Locator {
    return this.page.locator('.modal-overlay, [data-testid="modal-overlay"]');
  }

  // Actions

  async modal_close(): Promise<void> {
    await this.modal_closeButton.click();
  }

  async modal_confirm(): Promise<void> {
    await this.modal_confirmButton.click();
  }

  async modal_cancel(): Promise<void> {
    await this.modal_cancelButton.click();
  }

  async modal_clickOutside(): Promise<void> {
    await this.modal_overlay.click({ position: { x: 0, y: 0 } });
  }

  // State checks

  async modal_isOpen(): Promise<boolean> {
    return await this.modal_container.isVisible();
  }

  async modal_isClosed(): Promise<boolean> {
    return !(await this.modal_container.isVisible());
  }

  async modal_getTitle(): Promise<string> {
    return (await this.modal_title.textContent()) || '';
  }

  // Waits

  async modal_waitForOpen(timeout?: number): Promise<void> {
    await this.modal_container.waitFor({ state: 'visible', timeout });
  }

  async modal_waitForClose(timeout?: number): Promise<void> {
    await this.modal_container.waitFor({ state: 'hidden', timeout });
  }
}
