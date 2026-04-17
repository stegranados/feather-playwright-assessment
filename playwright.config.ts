import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { getRuntimeEnv } from './lib/env';

dotenv.config();
const runtimeEnv = getRuntimeEnv();
const allureResultsDir = process.env.ALLURE_RESULTS_DIR || 'allure-results';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['allure-playwright', { outputFolder: allureResultsDir }],
    ['list'],
    ['./lib/reporters/flake-summary-reporter.ts'],
    ['@midscene/web/playwright-reporter', { type: 'merged' }],
  ],

  timeout: 5 * 60 * 1000, // 5 minutes
  expect: {
    timeout: 15000,
  },

  use: {
    baseURL: runtimeEnv.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    timezoneId: runtimeEnv.timezone,
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'msedge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
  ],
});
