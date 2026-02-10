import { Page, Locator } from '@playwright/test';

/**
 * Provides form field interactions.
 * Apply to any page with form inputs.
 */
export class FormMixin {
  protected page!: Page;

  // Locators

  get form_container(): Locator {
    return this.page.locator('form').first();
  }

  get form_submitButton(): Locator {
    return this.page.getByRole('button', { name: /submit|save|send|continue/i });
  }

  get form_resetButton(): Locator {
    return this.page.getByRole('button', { name: /reset|clear/i });
  }

  get form_validationErrors(): Locator {
    return this.page.locator('[class*="error"], [role="alert"], .validation-error');
  }

  // Field interactions

  async form_fillField(name: string, value: string): Promise<void> {
    const field = this.page.getByRole('textbox', { name: new RegExp(name, 'i') });
    await field.fill(value);
  }

  async form_fillEmail(value: string): Promise<void> {
    const field = this.page.getByRole('textbox', { name: /email/i });
    await field.fill(value);
  }

  async form_fillPassword(value: string): Promise<void> {
    const field = this.page.locator('input[type="password"]').first();
    await field.fill(value);
  }

  async form_selectOption(label: string, value: string): Promise<void> {
    const select = this.page.getByRole('combobox', { name: new RegExp(label, 'i') });
    await select.selectOption(value);
  }

  async form_checkBox(label: string): Promise<void> {
    const checkbox = this.page.getByRole('checkbox', { name: new RegExp(label, 'i') });
    await checkbox.check();
  }

  async form_uncheckBox(label: string): Promise<void> {
    const checkbox = this.page.getByRole('checkbox', { name: new RegExp(label, 'i') });
    await checkbox.uncheck();
  }

  async form_selectRadio(label: string): Promise<void> {
    const radio = this.page.getByRole('radio', { name: new RegExp(label, 'i') });
    await radio.check();
  }

  // Form actions

  async form_submit(): Promise<void> {
    await this.form_submitButton.click();
  }

  async form_reset(): Promise<void> {
    await this.form_resetButton.click();
  }

  async form_pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  // Validation

  async form_getValidationErrors(): Promise<string[]> {
    return await this.form_validationErrors.allTextContents();
  }

  async form_hasValidationErrors(): Promise<boolean> {
    return (await this.form_validationErrors.count()) > 0;
  }

  async form_getFieldValue(name: string): Promise<string> {
    const field = this.page.getByRole('textbox', { name: new RegExp(name, 'i') });
    return (await field.inputValue()) || '';
  }
}
