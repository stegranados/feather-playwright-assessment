import { test as base, type ConsoleMessage, type Request, type Response } from '@playwright/test';
import * as fs from 'fs';
import { attachment } from 'allure-js-commons';
import logger from '../utils/logger';

export interface HelperFixtures {
  waitForPageLoad: () => Promise<void>;
  blockThirdPartyNoise: void;
  saveAttachments: void;
  saveBrowserVersion: void;
}

const log = logger({ filename: __filename });
const SLOW_RESPONSE_THRESHOLD_MS = 3000;

const BLOCKED_THIRD_PARTY_PATTERN =
  /\.(zendesk\.com|zdassets\.com|stripe\.(com|network)|google-analytics\.com|googletagmanager\.com)\//;

export const test = base.extend<HelperFixtures>({
  waitForPageLoad: async ({ page }, use) => {
    await use(async () => {
      log.debug('Waiting for page load', { url: page.url() });
      await page.waitForLoadState('load', { timeout: 60000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 60000 });
      log.debug('Page load completed');
    });
  },

  /**
   * Auto-blocks third-party scripts (Zendesk, Stripe telemetry, GA) that
   * create continuous network chatter and prevent networkidle from resolving.
   * These services are not under test and only add latency + flakiness.
   */
  blockThirdPartyNoise: [
    async ({ page }, use) => {
      await page.route(BLOCKED_THIRD_PARTY_PATTERN, (route) => route.abort());
      log.debug('Blocked third-party noise routes');
      await use();
    },
    { auto: true },
  ],

  /**
   * Auto-captures runtime diagnostics for flake analysis and screenshots on failure.
   */
  saveAttachments: [
    async ({ page }, use, testInfo) => {
      const logs: string[] = [];
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const networkIssues: string[] = [];
      const slowResponses: string[] = [];
      const requestStartTimes = new Map<Request, number>();

      const onConsole = (msg: ConsoleMessage) => {
        const entry = `${msg.type()}: ${msg.text()}`;
        logs.push(entry);
        if (msg.type() === 'error' || msg.type() === 'warning') {
          consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
        }
      };

      const onPageError = (error: Error) => {
        pageErrors.push(error.message);
      };

      const onRequest = (request: Request) => {
        requestStartTimes.set(request, Date.now());
      };

      const onResponse = (response: Response) => {
        const request = response.request();
        const start = requestStartTimes.get(request);
        if (start !== undefined) {
          requestStartTimes.delete(request);
        }

        const durationMs = start !== undefined ? Date.now() - start : undefined;
        const status = response.status();
        if (status >= 400 || status === 0) {
          networkIssues.push(`${request.method()} ${status} ${response.url()}`);
        }
        if (durationMs !== undefined && durationMs > SLOW_RESPONSE_THRESHOLD_MS) {
          slowResponses.push(`${durationMs}ms ${request.method()} ${status} ${response.url()}`);
        }
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);
      page.on('request', onRequest);
      page.on('response', onResponse);

      await use();

      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('request', onRequest);
      page.off('response', onResponse);

      if (consoleErrors.length > 0) {
        await testInfo.attach('console-errors', {
          body: Buffer.from(consoleErrors.join('\n')),
          contentType: 'text/plain',
        });
      }

      if (pageErrors.length > 0) {
        await testInfo.attach('page-errors', {
          body: Buffer.from(pageErrors.join('\n')),
          contentType: 'text/plain',
        });
      }

      if (networkIssues.length > 0) {
        await testInfo.attach('network-issues', {
          body: Buffer.from(networkIssues.join('\n')),
          contentType: 'text/plain',
        });
      }

      if (slowResponses.length > 0) {
        await testInfo.attach('slow-responses', {
          body: Buffer.from(slowResponses.join('\n')),
          contentType: 'text/plain',
        });
      }

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
