/**
 * Network-idle diagnostic — run this to find out WHY `networkidle` stalls.
 *
 * Logs into Feathr, reaches the dashboard, then observes all network
 * activity for OBSERVATION_WINDOW_MS.  At the end it reports:
 *
 *  1. Requests still pending (never completed — the #1 `networkidle` blocker)
 *  2. Repeated URL patterns (polling / heartbeat endpoints)
 *  3. Failed requests (4xx / 5xx / status 0)
 *  4. Slow requests (> 3 s)
 *  5. WebSocket connections
 *  6. A timeline of every request start + finish
 *
 * Usage:
 *   npx playwright test tests/diagnostics/network-idle-diagnostic.spec.ts --headed
 */
import { test, expect } from '../../lib/fixtures/page-fixtures';
import { TestTimeouts } from '../../lib/constants';
import { getAuthEnv } from '../../lib/env';
import { MailinatorInbox } from '../../lib/mailinator-provider';
import { createFeathrOtpWatch } from '../../lib/test-helpers/feathr-otp-watch';

const OBSERVATION_WINDOW_MS = 30_000;
const SLOW_THRESHOLD_MS = 3_000;

interface RequestRecord {
  id: number;
  method: string;
  url: string;
  resourceType: string;
  startTime: number;
  endTime?: number;
  status?: number;
  failed?: boolean;
  failureText?: string;
}

function urlKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

test('Diagnose networkidle blockers after login → dashboard', async ({ page, loginPage, dashboardPage }, testInfo) => {
  test.setTimeout(5 * 60_000);
  const authEnv = getAuthEnv();

  // ── Login (same as your beforeEach) ────────────────────────────
  const inbox = MailinatorInbox.fromEnv(authEnv.otpUsername);
  const otpWatch = await createFeathrOtpWatch(inbox);

  await loginPage.navigate();
  await otpWatch.markOtpTrigger();
  await loginPage.login(authEnv.testUserEmail, authEnv.testUserPassword);

  const dashboardIsVisible = await dashboardPage.nav_homeLink
    .isVisible({ timeout: TestTimeouts.dashboardShell })
    .catch(() => false);

  if (!dashboardIsVisible) {
    await expect(loginPage.inpOtp).toBeVisible({ timeout: TestTimeouts.otpFieldVisible });
    const otpEmail = await otpWatch.readNextOtp();
    await loginPage.enterOtp(otpEmail.otp);
    await loginPage.submitOtpStep();
    await expect(dashboardPage.nav_homeLink).toBeVisible({
      timeout: TestTimeouts.dashboardShell,
    });
  }

  // ── Begin network observation ──────────────────────────────────
  const records: RequestRecord[] = [];
  const wsUrls: string[] = [];
  let nextId = 0;
  const requestIdMap = new Map<ReturnType<typeof page.on>, number>();
  const observationStart = Date.now();

  page.on('request', (req) => {
    const id = nextId++;
    requestIdMap.set(req as never, id);
    records.push({
      id,
      method: req.method(),
      url: req.url(),
      resourceType: req.resourceType(),
      startTime: Date.now() - observationStart,
    });
  });

  page.on('response', (res) => {
    const req = res.request();
    const id = requestIdMap.get(req as never);
    if (id !== undefined) {
      const rec = records.find((r) => r.id === id);
      if (rec) {
        rec.endTime = Date.now() - observationStart;
        rec.status = res.status();
      }
    }
  });

  page.on('requestfailed', (req) => {
    const id = requestIdMap.get(req as never);
    if (id !== undefined) {
      const rec = records.find((r) => r.id === id);
      if (rec) {
        rec.endTime = Date.now() - observationStart;
        rec.failed = true;
        rec.failureText = req.failure()?.errorText ?? 'unknown';
      }
    }
  });

  page.on('websocket', (ws) => {
    wsUrls.push(ws.url());
  });

  // Wait for the observation window
  await page.waitForTimeout(OBSERVATION_WINDOW_MS);

  // Also try networkidle with a short timeout to see if it would resolve
  const networkIdleReached = await page
    .waitForLoadState('networkidle', { timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  // ── Analyze results ────────────────────────────────────────────
  const pending = records.filter((r) => r.endTime === undefined);
  const failed = records.filter((r) => r.failed || (r.status !== undefined && r.status >= 400));
  const slow = records.filter(
    (r) => r.endTime !== undefined && !r.failed && r.endTime - r.startTime > SLOW_THRESHOLD_MS,
  );

  const urlCounts = new Map<string, number>();
  for (const r of records) {
    const key = urlKey(r.url);
    urlCounts.set(key, (urlCounts.get(key) ?? 0) + 1);
  }
  const repeatedUrls = [...urlCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  // ── Build report ───────────────────────────────────────────────
  const lines: string[] = [];
  lines.push('='.repeat(80));
  lines.push('  NETWORK-IDLE DIAGNOSTIC REPORT');
  lines.push(`  Observation window: ${OBSERVATION_WINDOW_MS / 1000}s after dashboard loaded`);
  lines.push(`  Total requests captured: ${records.length}`);
  lines.push(`  networkidle reached in 5s check: ${networkIdleReached ? 'YES' : 'NO'}`);
  lines.push('='.repeat(80));

  // 1. Pending
  lines.push('');
  lines.push(`── 1. STILL-PENDING REQUESTS (${pending.length}) ─── these block networkidle ──`);
  if (pending.length === 0) {
    lines.push('  (none)');
  } else {
    for (const r of pending) {
      lines.push(`  [${r.resourceType}] ${r.method} ${r.url}`);
      lines.push(`    started at +${r.startTime}ms, still pending after ${OBSERVATION_WINDOW_MS}ms`);
    }
  }

  // 2. Repeated / polling
  lines.push('');
  lines.push(`── 2. REPEATED URL PATTERNS (${repeatedUrls.length}) ─── likely polling ──`);
  if (repeatedUrls.length === 0) {
    lines.push('  (none)');
  } else {
    for (const [url, count] of repeatedUrls) {
      lines.push(`  ${count}x  ${url}`);
    }
  }

  // 3. Failed
  lines.push('');
  lines.push(`── 3. FAILED REQUESTS (${failed.length}) ──`);
  if (failed.length === 0) {
    lines.push('  (none)');
  } else {
    for (const r of failed) {
      const detail = r.failed ? `failure: ${r.failureText}` : `status: ${r.status}`;
      lines.push(`  ${r.method} ${r.url}`);
      lines.push(`    ${detail}`);
    }
  }

  // 4. Slow
  lines.push('');
  lines.push(`── 4. SLOW REQUESTS (> ${SLOW_THRESHOLD_MS}ms) (${slow.length}) ──`);
  if (slow.length === 0) {
    lines.push('  (none)');
  } else {
    for (const r of slow) {
      const duration = r.endTime! - r.startTime;
      lines.push(`  ${duration}ms  ${r.method} ${r.status ?? '?'} ${r.url}`);
    }
  }

  // 5. WebSockets
  lines.push('');
  lines.push(`── 5. WEBSOCKET CONNECTIONS (${wsUrls.length}) ──`);
  if (wsUrls.length === 0) {
    lines.push('  (none)');
  } else {
    for (const url of wsUrls) {
      lines.push(`  ${url}`);
    }
  }

  // 6. Full timeline
  lines.push('');
  lines.push('── 6. REQUEST TIMELINE (first 100) ──');
  const sorted = [...records].sort((a, b) => a.startTime - b.startTime).slice(0, 100);
  for (const r of sorted) {
    const end = r.endTime !== undefined ? `+${r.endTime}ms` : 'PENDING';
    const st = r.status !== undefined ? ` ${r.status}` : '';
    const fail = r.failed ? ' FAILED' : '';
    lines.push(`  +${String(r.startTime).padStart(6)}ms → ${end.padStart(10)} ${r.method}${st}${fail} [${r.resourceType}] ${r.url}`);
  }

  const report = lines.join('\n');

  // Print to stdout so you see it immediately
  console.log('\n' + report + '\n');

  // Attach as test artifact
  await testInfo.attach('network-idle-diagnostic', {
    body: Buffer.from(report),
    contentType: 'text/plain',
  });

  // ── Summary assertion (informational, always passes) ───────────
  // If you want the test to FAIL when networkidle can't be reached, uncomment:
  // expect(networkIdleReached, 'networkidle was not reached within 5s').toBe(true);
});
