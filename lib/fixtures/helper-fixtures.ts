import { test as base } from '@playwright/test';
import * as fs from 'fs';
import { attachment } from 'allure-js-commons';
import logger from '../utils/logger';

interface HelperFixtures {
  waitForPageLoad: () => Promise<void>;
  saveAttachments: void;
  saveBrowserVersion: void;
}

const log = logger({ filename: __filename });

export const test = base.extend<HelperFixtures>({
  waitForPageLoad: async ({ page }, use) => {
    await use(async () => {
      log.debug('Waiting for page load', { url: page.url() });
      await page.waitForLoadState('load', { timeout: 60000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 60000 });
      log.debug('Page load completed');
    });
  },

  /**
   * Auto-captures console logs and screenshots on test failure.
   */
  saveAttachments: [
    async ({ page }, use, testInfo) => {
      const logs: string[] = [];
      page.on('console', (msg) => {
        logs.push(`${msg.type()}: ${msg.text()}`);
      });

      await use();

      if (testInfo.status !== testInfo.expectedStatus) {
        log.error('Test failed - capturing artifacts', {
          testTitle: testInfo.title,
          status: testInfo.status,
          retry: testInfo.retry,
        });

        const logFile = testInfo.outputPath('logs.txt');
        await fs.promises.writeFile(logFile, logs.join('\n'), 'utf8');
        testInfo.attachments.push({
          name: 'logs',
          contentType: 'text/plain',
          path: logFile,
        });

        const screenshotBuffer = await page.screenshot();
        await attachment(`${testInfo.title}-${testInfo.status}`, screenshotBuffer, {
          contentType: 'image/png',
        });
        await testInfo.attach('screenshot', {
          body: screenshotBuffer,
          contentType: 'image/png',
        });
      }
    },
    { auto: true },
  ],

  /**
   * Auto-saves browser version info for debugging.
   */
  saveBrowserVersion: [
    async ({ browser, browserName }, use, testInfo) => {
      await use();

      const browserVersion = browser.version();
      log.debug('Browser version captured', {
        browser: browserName,
        version: browserVersion,
      });

      const versionFile = testInfo.outputPath(`${browserName}-version.txt`);
      await fs.promises.writeFile(versionFile, browserVersion, 'utf8');
      testInfo.attachments.push({
        name: 'browser version',
        contentType: 'text/plain',
        path: versionFile,
      });
    },
    { auto: true },
  ],
});

test.beforeEach(async ({}, testInfo) => {
  log.info('Test started', {
    testId: testInfo.title,
    project: testInfo.project.name,
    retry: testInfo.retry,
    workerIndex: testInfo.workerIndex,
  });
});

test.afterEach(async ({}, testInfo) => {
  const logData = {
    testId: testInfo.title,
    status: testInfo.status,
    duration: testInfo.duration,
    retry: testInfo.retry,
  };

  if (testInfo.status === 'passed') {
    log.info('Test passed', logData);
  } else if (testInfo.status === 'failed') {
    log.error('Test failed', {
      ...logData,
      error: testInfo.error?.message || 'Unknown error',
    });
  } else if (testInfo.status === 'skipped') {
    log.warn('Test skipped', logData);
  }
});

export const expect = test.expect;
