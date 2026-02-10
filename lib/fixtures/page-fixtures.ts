import { test as helperFixture } from './helper-fixtures';
import { LoginPage } from '../../page-objects/login.page';
import { DashboardPage } from '../../page-objects/dashboard.page';
import { ReportsPage } from '../../page-objects/reports.page';

interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  reportsPage: ReportsPage;
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

  reportsPage: async ({ page }, use) => {
    const reportsPage = new ReportsPage(page);
    await use(reportsPage);
  },
});

export const expect = test.expect;
