import { expect, type Locator, type Page } from '@playwright/test';
import { TestTimeouts } from '../constants';

const DUPLICATE_DRAFT_LABEL = /\(Clone|\(Copy/i;
const PUBLISHED_CAMPAIGN_URL_PATTERN = /\/projects\/[^/]+\/campaigns\/[^/?#]+\/?$/;

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

interface GridPrepareOptions {
  clearSearch?: boolean;
}

export interface MarketingPublishedCampaignRow {
  name: string;
  campaignType: string;
  status: string;
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
    return this.mktgrid_grid.getByRole('row', { name: /More options/ });
  }

  mktgrid_rowByName(campaignName: string): Locator {
    return this.mktgrid_dataRows().filter({ hasText: campaignName });
  }

  mktgrid_campaignTypeChip(row: Locator): Locator {
    return row.locator('[data-name="campaign-type-chip"]');
  }

  mktgrid_campaignStatusChip(row: Locator): Locator {
    return row.locator('[data-name="campaign-status"]');
  }

  mktgrid_publishedRows(): Locator {
    return this.mktgrid_dataRows().filter({
      has: this.page.locator('[data-name="campaign-status"]', { hasText: 'Published' }),
    });
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

  async mktgrid_prepareAfterFiltersApplied(
    options: GridPrepareOptions = {}
  ): Promise<void> {
    if (options.clearSearch ?? true) {
      await this.mktgrid_clearSearchIfPresent();
    }
    await this.mktgrid_showMaxRows();
    await expect(this.page.getByText('Loading...')).toBeHidden({
      timeout: TestTimeouts.marketingGridVisible,
    }).catch(() => undefined);
  }

  async mktgrid_getFirstPublishedCampaignRowNameOrNull(): Promise<string | null> {
    const campaign = await this.mktgrid_getFirstPublishedCampaignOrNull();
    return campaign?.name ?? null;
  }

  async mktgrid_getFirstPublishedCampaignOrNull(): Promise<MarketingPublishedCampaignRow | null> {
    await this.mktgrid_prepareAfterFiltersApplied({ clearSearch: false });

    const publishedRows = this.mktgrid_publishedRows();
    if ((await publishedRows.count()) === 0) {
      return null;
    }
    const firstPublishedRow = publishedRows.first();
    const name = (await firstPublishedRow.getByRole('link').first().innerText()).trim();
    const campaignType = (await this.mktgrid_campaignTypeChip(firstPublishedRow).innerText()).trim();
    const status = (await this.mktgrid_campaignStatusChip(firstPublishedRow).innerText()).trim();

    if (!name) {
      return null;
    }

    return { name, campaignType, status };
  }

  /** Click the first published row's link without re-fetching data (use after getFirstPublishedCampaignOrNull). */
  async mktgrid_clickFirstPublishedCampaign(): Promise<void> {
    const firstPublishedRow = this.mktgrid_publishedRows().first();
    await expect(firstPublishedRow).toBeVisible({ timeout: TestTimeouts.marketingRowVisible });
    await firstPublishedRow.getByRole('link').first().click();
  }

  async mktgrid_openFirstPublishedCampaign(): Promise<MarketingPublishedCampaignRow> {
    const campaign = await this.mktgrid_getFirstPublishedCampaignOrNull();
    if (!campaign) {
      throw new Error('No published campaign is visible in the current Marketing grid results.');
    }

    const firstPublishedRow = this.mktgrid_publishedRows().first();
    await expect(firstPublishedRow).toBeVisible({ timeout: TestTimeouts.marketingRowVisible });
    await firstPublishedRow.getByRole('link').first().click();
    await expect(this.page).toHaveURL(PUBLISHED_CAMPAIGN_URL_PATTERN, {
      timeout: TestTimeouts.urlPathContains,
    });

    return campaign;
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
