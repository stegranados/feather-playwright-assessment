import { expect, type Locator, type Page } from '@playwright/test';
import { TestTimeouts } from '../constants';

const DUPLICATE_DRAFT_LABEL = /\(Clone|\(Copy/i;

function stripCloneSuffix(displayName: string): string {
  let normalizedName = displayName.trim();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const nextName = normalizedName.replace(/\s*\((?:Clone|Copy)[^)]*\)\s*$/i, '').trim();
    if (nextName === normalizedName) {
      break;
    }
    normalizedName = nextName;
  }

  return normalizedName;
}

export class MarketingGridMixin {
  protected page!: Page;

  get mktgrid_grid(): Locator {
    return this.page.getByRole('grid');
  }

  get mktgrid_searchByNameInput(): Locator {
    return this.page.getByRole('textbox', { name: /Search by name/i });
  }

  get mktgrid_rowsPerPageCombobox(): Locator {
    return this.page.getByRole('combobox').filter({ hasText: /rows/i });
  }

  mktgrid_dataRows(): Locator {
    // Temporary fallback until the product exposes stable row identity.
    return this.page.getByRole('row', { name: /More options/ });
  }

  mktgrid_rowByName(campaignName: string): Locator {
    return this.mktgrid_dataRows().filter({ hasText: campaignName });
  }

  mktgrid_cloneSearchStem(displayName: string): string {
    return stripCloneSuffix(displayName);
  }

  async mktgrid_showMaxRows(): Promise<void> {
    if ((await this.mktgrid_rowsPerPageCombobox.count()) === 0) {
      return;
    }

    await this.mktgrid_rowsPerPageCombobox.selectOption({ label: '100 rows' });
    await expect(this.mktgrid_grid).toBeVisible({ timeout: TestTimeouts.marketingGridVisible });
  }

  async mktgrid_clearSearchIfPresent(): Promise<void> {
    if ((await this.mktgrid_searchByNameInput.count()) === 0) {
      return;
    }

    await this.mktgrid_searchByNameInput.fill('');
    await expect(this.mktgrid_grid).toBeVisible({ timeout: TestTimeouts.marketingGridVisible });
  }

  async mktgrid_searchByName(campaignName: string): Promise<void> {
    await this.mktgrid_searchByNameInput.fill('');
    await this.mktgrid_searchByNameInput.fill(campaignName);
  }

  async mktgrid_prepareAfterFiltersApplied(): Promise<void> {
    await this.mktgrid_clearSearchIfPresent();
    await this.mktgrid_showMaxRows();
    await expect(this.page.getByText('Loading...')).toBeHidden({
      timeout: TestTimeouts.marketingGridVisible,
    }).catch(() => undefined);
  }

  async mktgrid_getFirstPublishedCampaignRowNameOrNull(): Promise<string | null> {
    await this.mktgrid_prepareAfterFiltersApplied();

    const row = this.mktgrid_dataRows().filter({ hasText: 'Published' }).first();
    if (!(await row.isVisible({ timeout: TestTimeouts.marketingRowVisible }).catch(() => false))) {
      return null;
    }

    const rowLinkText = (await row.getByRole('link').first().innerText()).trim();
    return rowLinkText.length > 0 ? rowLinkText : null;
  }

  async mktgrid_countVisibleDraftCloneRowsForBaseName(baseName: string): Promise<number> {
    const searchStem = this.mktgrid_cloneSearchStem(baseName);
    await this.mktgrid_searchByName(searchStem);

    return this.mktgrid_dataRows()
      .filter({ hasText: searchStem })
      .filter({ hasText: 'Draft' })
      .filter({ hasText: DUPLICATE_DRAFT_LABEL })
      .count();
  }

  async mktgrid_openVisibleFirstDraftCloneEditor(baseName: string): Promise<void> {
    const searchStem = this.mktgrid_cloneSearchStem(baseName);
    await this.mktgrid_searchByName(searchStem);

    const cloneRow = this.mktgrid_dataRows()
      .filter({ hasText: searchStem })
      .filter({ hasText: 'Draft' })
      .filter({ hasText: DUPLICATE_DRAFT_LABEL })
      .first();

    await expect(cloneRow).toBeVisible({ timeout: TestTimeouts.marketingRowVisible });
    await cloneRow.getByRole('link').first().click();
    await expect(this.page).toHaveURL(/\/edit(\/|$)/);
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
  }
}
