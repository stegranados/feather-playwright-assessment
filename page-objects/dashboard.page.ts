import { Page, Locator, expect } from '@playwright/test';
import { applyMixins } from '../lib/core/apply-mixins';
import { NavigationMixin, TableMixin, ModalMixin } from '../lib/mixins';

/**
 * Feathr dashboard / home shell page object.
 * Composes: NavigationMixin, TableMixin, ModalMixin — plus Feathr-specific locators below.
 */
export class DashboardPage {
  constructor(protected readonly page: Page) {}

  /* Home navigation (role-based — preferred for shell actions) */

  get lnkHome(): Locator {
    return this.page.getByRole('link', { name: 'Home' });
  }

  get lnkDashboard(): Locator {
    return this.page.getByRole('link', { name: 'Dashboard' });
  }

  get navHomeNavigation(): Locator {
    return this.page.getByRole('navigation', { name: 'Home navigation' });
  }

  /** First button inside the “Home navigation” region (e.g. sidebar / menu toggle). */
  get btnHomeNavigation(): Locator {
    return this.navHomeNavigation.getByRole('button');
  }

  get lnkAll(): Locator {
    return this.page.getByRole('link', { name: 'All' });
  }

  get btnCreate(): Locator {
    return this.page.getByRole('button', { name: 'Create' });
  }

  /* Earlier captures (text / layout-specific) */

  /** Collapsed menu / expand control — attribute selector needs balanced quotes. */
  get btnButton(): Locator {
    return this.page.locator('button[aria-expanded="false"]');
  }

  get lblMarketing(): Locator {
    return this.page.getByText('Marketing', { exact: true });
  }

  get lblAccounts(): Locator {
    return this.page.getByText('Accounts', { exact: true });
  }

  /** Plain-text “Dashboard” — prefer {@link lnkDashboard} when matching the nav link. */
  get lblDashboard(): Locator {
    return this.page.getByText('Dashboard', { exact: true });
  }

  get dripCampaignButton(): Locator {
    return this.page.getByRole('button', { name: 'Drip Send a series of' });
  }

  get txtCampaignName(): Locator {
    return this.page.getByRole('textbox', { name: 'Campaign name' });
  }

  get headingCreateCampaign(): Locator {
    return this.page.getByRole('heading', { name: 'Create a campaign' });
  }

  /**
   * Opens the dashboard route. Call after login if your app requires auth.
   * Adjust the path if Feathr uses a different URL.
   */
  async navigate(): Promise<void> {
    await this.page.goto('/dashboard');
    await expect(this.lnkDashboard).toBeVisible();
  }

  /* Actions — home shell */

  async clickHomeLink(): Promise<void> {
    await this.lnkHome.click();
  }

  async clickHomeNavigationButton(): Promise<void> {
    await this.btnHomeNavigation.click();
  }

  async clickAllLink(): Promise<void> {
    await this.lnkAll.click();
  }

  async clickCreate(): Promise<void> {
    await this.btnCreate.click();
  }

  /* Actions — earlier captures */

  async typeCampaignName(campaignName: string): Promise<void> {
    await this.txtCampaignName.fill(campaignName);
  }

  async isCampaignTitleVisible(): Promise<boolean> {
    return await this.headingCreateCampaign.isVisible();
  }

  async clickButton(): Promise<void> {
    await this.btnButton.click();
  }

  async clickMarketing(): Promise<void> {
    await this.lblMarketing.click();
  }

  async clickAccounts(): Promise<void> {
    await this.lblAccounts.click();
  }

  /** Clicks the “Dashboard” nav link (role-based). */
  async clickDashboard(): Promise<void> {
    await this.lnkDashboard.click();
  }

  async clickDripCampaignButton(): Promise<void> {
    await this.dripCampaignButton.click();
  }
}

// eslint-disable-next-line no-redeclare
export interface DashboardPage extends NavigationMixin, TableMixin, ModalMixin {}
applyMixins(DashboardPage, [NavigationMixin, TableMixin, ModalMixin]);
