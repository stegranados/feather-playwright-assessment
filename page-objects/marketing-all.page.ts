import { expect, type Page } from '@playwright/test';
import { applyMixins } from '../lib/core/apply-mixins';
import { CREATED_RESOURCE_URL, TestTimeouts } from '../lib/constants';
import {
  CampaignDuplicateMixin,
  MantineOverlayMixin,
  MarketingFiltersMixin,
  MarketingGridMixin,
} from '../lib/mixins';

function marketingRowByName(page: Page, uniqueName: string) {
  return page
    .getByRole('row')
    .filter({ hasNotText: 'Page totals' })
    .filter({ hasText: uniqueName });
}

export class MarketingAllPage {
  constructor(protected readonly page: Page) {}

  async navigate(): Promise<void> {
    await this.openMarketingAll();
  }

  async searchForCampaign(name: string): Promise<void> {
    await this.mkfilter_campaignNameSearchBar().fill(name);
    await this.mkfilter_campaignNameSearchBar().press('Enter');
    await expect(this.mktgrid_grid).toBeVisible({ timeout: TestTimeouts.marketingGridVisible });
    await expect(this.page.getByText('Loading...')).toBeHidden({
      timeout: TestTimeouts.marketingGridVisible,
    }).catch(() => undefined);
  }

  async openMarketingAll(): Promise<void> {
    await this.page.goto('/marketing/all');
    await expect(this.mktgrid_grid).toBeVisible({ timeout: TestTimeouts.marketingGridVisible });
    await this.mantine_dismissBlockingCreateCampaignModal();
  }

  async clearMarketingFilters(): Promise<void> {
    await this.openMarketingAll();
    await this.mktfilter_openDialog();
    await this.mktfilter_clearIfVisible();
    await this.mktfilter_apply();
    await expect(this.mktgrid_grid).toBeVisible({ timeout: TestTimeouts.marketingGridVisible });
  }

  async filterPublishedCampaignsOnly(opts?: {
    skipNavigation?: boolean;
    campaignTypeKey?: string;
  }): Promise<void> {
    if (!opts?.skipNavigation) {
      await this.openMarketingAll();
    }
    await this.mktfilter_openDialog();
    await this.mktfilter_clearIfVisible();
    await this.mktfilter_pickComboboxValue('Status', 'Published');
    if (opts?.campaignTypeKey) {
      await this.mktfilter_pickCampaignType(opts.campaignTypeKey);
    }
    await this.mktfilter_apply();
    await expect(this.mktgrid_grid).toBeVisible({ timeout: TestTimeouts.marketingGridVisible });
    await this.mktgrid_prepareAfterFiltersApplied();
  }

  async tryApplyPublishedAndTypeFilters(typeLabel: string): Promise<boolean> {
    await this.openMarketingAll();
    await this.mktfilter_openDialog();
    await this.mktfilter_clearIfVisible();
    await this.mktfilter_pickComboboxValue('Status', 'Published');

    const hasTypeOption = await this.mktfilter_selectTypeIfPresent(typeLabel);
    if (!hasTypeOption) {
      await this.mktfilter_closeWithoutApply();
      return false;
    }

    await this.mktfilter_apply();
    await expect(this.mktgrid_grid).toBeVisible({ timeout: TestTimeouts.marketingGridVisible });
    await this.mktgrid_prepareAfterFiltersApplied();
    return true;
  }

  async countDraftCloneRowsForBaseName(baseName: string): Promise<number> {
    await this.openMarketingAll();
    await this.clearMarketingFilters();
    await this.mktgrid_showMaxRows();
    return this.mktgrid_countVisibleDraftCloneRowsForBaseName(baseName);
  }

  async duplicatePublishedCampaignByName(
    campaignName: string,
    options?: { typeLabel?: string }
  ): Promise<void> {
    await this.openMarketingAll();
    if (options?.typeLabel) {
      const hasTypeOption = await this.tryApplyPublishedAndTypeFilters(options.typeLabel);
      if (!hasTypeOption) {
        throw new Error(`Type filter "${options.typeLabel}" not available; caller should have skipped.`);
      }
    } else {
      await this.filterPublishedCampaignsOnly();
    }

    const publishedRow = this.mktgrid_rowByName(campaignName)
      .filter({ hasText: 'Published' })
      .first();

    await expect(publishedRow).toBeVisible({ timeout: TestTimeouts.marketingRowVisible });
    await this.campdup_openFromRow(publishedRow);
    await this.campdup_expectCloningNotice();
    await this.campdup_confirm();
    await this.campdup_expectCloneStartedNotice(campaignName);
  }

  async expectDraftCloneCountIncreased(
    baseName: string,
    previousCount: number
  ): Promise<void> {
    await expect
      .poll(async () => this.countDraftCloneRowsForBaseName(baseName), {
        timeout: TestTimeouts.marketingCloneJob,
        intervals: [400, 800, 1200, 2000, 3000, 5000, 8000],
      })
      .toBeGreaterThan(previousCount);
  }

  async openFirstDraftCloneEditor(baseName: string): Promise<void> {
    await this.openMarketingAll();
    await this.clearMarketingFilters();
    await this.mktgrid_showMaxRows();
    await this.mktgrid_openVisibleFirstDraftCloneEditor(baseName);
  }

  async openCreateCampaignWizard(): Promise<void> {
    await this.openMarketingAll();
    await this.page.getByRole('button', { name: 'Create' }).click();
    await expect(this.page.getByRole('dialog', { name: 'Create a campaign' })).toBeVisible({
      timeout: TestTimeouts.marketingDialogVisible,
    });
  }

  private async campaignConfigurePageVisible(uniqueName: string): Promise<boolean> {
    const heading = this.page.getByRole('heading', { level: 1, name: uniqueName });
    return heading.isVisible({ timeout: 0 }).catch(() => false);
  }

  /** Wizard may land on an editor or return to Marketing with a new row. */
  async expectCampaignCreatedOrInGrid(uniqueName: string): Promise<void> {
    if (
      CREATED_RESOURCE_URL.test(this.page.url()) ||
      (await this.campaignConfigurePageVisible(uniqueName))
    ) {
      return;
    }

    const row = marketingRowByName(this.page, uniqueName);
    await expect
      .poll(
        async () => {
          if (
            CREATED_RESOURCE_URL.test(this.page.url()) ||
            (await this.campaignConfigurePageVisible(uniqueName))
          ) {
            return 1;
          }
          await this.openMarketingAll();
          await this.mktgrid_showMaxRows();
          const search = this.mktgrid_searchByNameInput;
          if ((await search.count()) > 0) {
            await search.fill('');
            await search.fill(uniqueName);
          }
          return row.count();
        },
        {
          timeout: TestTimeouts.marketingCampaignCreatedPoll,
          intervals: [600, 1_200, 2_000, 3_500, 5_000, 8_000],
        },
      )
      .toBeGreaterThan(0);

    if (
      CREATED_RESOURCE_URL.test(this.page.url()) ||
      (await this.campaignConfigurePageVisible(uniqueName))
    ) {
      return;
    }
    await expect(row.first()).toBeVisible();
  }
}

// eslint-disable-next-line no-redeclare -- declaration merging is required for applied mixins
export interface MarketingAllPage
  extends MarketingGridMixin,
    MarketingFiltersMixin,
    CampaignDuplicateMixin,
    MantineOverlayMixin {}

applyMixins(MarketingAllPage, [
  MarketingGridMixin,
  MarketingFiltersMixin,
  CampaignDuplicateMixin,
  MantineOverlayMixin,
]);
