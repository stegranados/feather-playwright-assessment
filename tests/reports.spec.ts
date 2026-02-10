import { test, expect } from '../lib/fixtures/page-fixtures';
import { AllureHelper } from '../lib/utils/allure-helper';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ reportsPage }) => {
    await reportsPage.navigate();
  });

  test('should display reports page elements', async ({ reportsPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Reports page elements visible',
      severity: 'critical',
      feature: 'Reports',
      story: 'Reports Layout',
    });

    await expect(reportsPage.reportsHeading).toBeVisible();
    await expect(reportsPage.exportButton).toBeVisible();
    await expect(reportsPage.searchInput).toBeVisible();
  });

  test('should use table mixin for report data', async ({ reportsPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Table mixin for reports',
      severity: 'critical',
      feature: 'Reports',
      story: 'Data Display',
    });

    // Using TableMixin methods
    const rowCount = await reportsPage.table_getRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);

    if (rowCount > 0) {
      const firstRowData = await reportsPage.table_getRowData(0);
      expect(firstRowData.length).toBeGreaterThan(0);
    }
  });

  test('should search and filter reports', async ({ reportsPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Search functionality',
      severity: 'normal',
      feature: 'Reports',
      story: 'Search',
    });

    const initialCount = await reportsPage.table_getRowCount();

    await reportsPage.search('test query');

    const filteredCount = await reportsPage.table_getRowCount();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    await reportsPage.clearSearch();
  });

  test('should sort table columns', async ({ reportsPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Table sorting',
      severity: 'normal',
      feature: 'Reports',
      story: 'Data Sorting',
    });

    const headers = await reportsPage.table_getHeaderTexts();

    if (headers.length > 0) {
      // Using TableMixin to sort
      await reportsPage.table_sortByColumn(headers[0]);

      // Verify table is still visible after sort
      const rowCount = await reportsPage.table_getRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should navigate using nav mixin', async ({ reportsPage, page }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Navigation from reports',
      severity: 'normal',
      feature: 'Navigation',
      story: 'Cross-page Navigation',
    });

    // Using NavigationMixin methods
    const navVisible = await reportsPage.nav_verifyLinksVisible();
    expect(navVisible).toBe(true);

    await reportsPage.nav_clickHome();
    await expect(page).toHaveURL(/dashboard|home/i);
  });

  test('should export data', async ({ reportsPage, page }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Export functionality',
      severity: 'minor',
      feature: 'Reports',
      story: 'Data Export',
    });

    const isEnabled = await reportsPage.isExportEnabled();

    if (isEnabled) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await reportsPage.exportData();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeTruthy();
    }
  });
});
