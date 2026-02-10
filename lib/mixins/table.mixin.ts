import { Page, Locator } from '@playwright/test';

/**
 * Provides data table/grid interactions.
 * Apply to any page that displays tabular data.
 */
export class TableMixin {
  protected page!: Page;

  // Locators

  get table_container(): Locator {
    return this.page.locator('table, [role="grid"]').first();
  }

  get table_rows(): Locator {
    return this.table_container.locator('tbody tr, [role="row"]:not([role="columnheader"])');
  }

  get table_headers(): Locator {
    return this.table_container.locator('th, [role="columnheader"]');
  }

  get table_emptyState(): Locator {
    return this.page.getByText(/no data|no results|empty/i);
  }

  // Actions

  async table_clickRow(index: number): Promise<void> {
    await this.table_rows.nth(index).click();
  }

  async table_clickRowByText(text: string): Promise<void> {
    await this.table_rows.filter({ hasText: text }).first().click();
  }

  async table_sortByColumn(headerText: string): Promise<void> {
    await this.table_headers.filter({ hasText: headerText }).click();
  }

  // Data extraction

  async table_getRowCount(): Promise<number> {
    return await this.table_rows.count();
  }

  async table_getHeaderTexts(): Promise<string[]> {
    return await this.table_headers.allTextContents();
  }

  async table_getCellValue(row: number, column: number): Promise<string> {
    const cell = this.table_rows.nth(row).locator('td, [role="cell"]').nth(column);
    return (await cell.textContent()) || '';
  }

  async table_getRowData(rowIndex: number): Promise<string[]> {
    const cells = this.table_rows.nth(rowIndex).locator('td, [role="cell"]');
    return await cells.allTextContents();
  }

  // Assertions

  async table_isEmpty(): Promise<boolean> {
    const count = await this.table_getRowCount();
    return count === 0;
  }

  async table_hasRowWithText(text: string): Promise<boolean> {
    const row = this.table_rows.filter({ hasText: text });
    return (await row.count()) > 0;
  }
}
