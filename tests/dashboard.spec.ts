import { test, expect } from '../lib/fixtures/page-fixtures';
import { AllureHelper } from '../lib/utils/allure-helper';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.navigate();
  });

  test('should display dashboard elements', async ({ dashboardPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Dashboard elements visible',
      severity: 'critical',
      feature: 'Dashboard',
      story: 'Dashboard Layout',
    });

    const isVisible = await dashboardPage.isDashboardVisible();
    expect(isVisible).toBe(true);
  });

  test('should use navigation mixin', async ({ dashboardPage, page }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Navigation mixin usage',
      severity: 'critical',
      feature: 'Navigation',
      story: 'Nav Bar',
    });

    // Using NavigationMixin methods
    const navLinksVisible = await dashboardPage.nav_verifyLinksVisible();
    expect(navLinksVisible).toBe(true);

    await dashboardPage.nav_clickSettings();
    await expect(page).toHaveURL(/settings/i);
  });

  test('should use table mixin for data grid', async ({ dashboardPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Table mixin usage',
      severity: 'normal',
      feature: 'Dashboard',
      story: 'Data Display',
    });

    // Using TableMixin methods
    const rowCount = await dashboardPage.table_getRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);

    const headers = await dashboardPage.table_getHeaderTexts();
    expect(headers.length).toBeGreaterThan(0);
  });

  test('should use modal mixin for dialogs', async ({ dashboardPage }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Modal mixin usage',
      severity: 'normal',
      feature: 'Dashboard',
      story: 'Modals',
    });

    // Trigger a modal (clicking stats widget opens details modal)
    await dashboardPage.clickStatsWidget();

    // Using ModalMixin methods
    await dashboardPage.modal_waitForOpen(5000);
    const isOpen = await dashboardPage.modal_isOpen();
    expect(isOpen).toBe(true);

    const title = await dashboardPage.modal_getTitle();
    expect(title).toBeTruthy();

    await dashboardPage.modal_close();
    await dashboardPage.modal_waitForClose(5000);
  });

  test('should navigate via nav mixin and return', async ({ dashboardPage, page }) => {
    await AllureHelper.applyTestMetadata({
      displayName: 'Navigation flow',
      severity: 'normal',
      feature: 'Navigation',
      story: 'Page Navigation',
    });

    await dashboardPage.nav_clickProfile();
    await expect(page).toHaveURL(/profile/i);

    await dashboardPage.nav_clickHome();
    await expect(page).toHaveURL(/dashboard|home/i);
  });
});
