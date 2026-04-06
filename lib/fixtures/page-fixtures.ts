import { test as helperFixture } from './helper-fixtures';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';
import { MarketingAllPage } from '../../page-objects/marketing-all.page';
import { CreateCampaignWizardPage } from '../../page-objects/create-campaign-wizard.page';
import { BillingConfigurationsPage } from '../../page-objects/billing-configurations.page';

interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  marketingPage: MarketingAllPage;
  createCampaignWizardPage: CreateCampaignWizardPage;
  billingConfigurationsPage: BillingConfigurationsPage;
}

export const test = helperFixture.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  marketingPage: async ({ page }, use) => {
    const marketingPage = new MarketingAllPage(page);
    await use(marketingPage);
  },

  createCampaignWizardPage: async ({ page }, use) => {
    const createCampaignWizardPage = new CreateCampaignWizardPage(page);
    await use(createCampaignWizardPage);
  },

  billingConfigurationsPage: async ({ page }, use) => {
    const billingConfigurationsPage = new BillingConfigurationsPage(page);
    await use(billingConfigurationsPage);
  },
});

export const expect = test.expect;
