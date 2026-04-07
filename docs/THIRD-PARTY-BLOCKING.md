# Third-Party Network Blocking Strategy

## Context

A network diagnostic analysis (see `tests/diagnostics/network-idle-diagnostic.spec.ts`) was performed against the Feathr staging environment to investigate recurring `networkidle` timeout failures across multiple test suites. The diagnostic captured all HTTP traffic for 30 seconds after a successful login and dashboard load.

## Findings

The Feathr application's own API (`blackbox-staging.feathr.co`) completed within **~250 ms**. The dashboard was fully interactive at that point. However, `page.waitForLoadState('networkidle')` — which requires **zero in-flight requests for 500 ms** — consistently failed to resolve due to continuous background requests from embedded third-party services.

### Identified third-party endpoints

| Domain | Service | Observed behavior | Impact on `networkidle` |
|---|---|---|---|
| `feathr.zendesk.com` | Zendesk Web Widget | Loads config, fires page-view events, opens a long-poll connection lasting **~15 seconds** | Primary blocker — the long-poll alone prevents the 500 ms idle window |
| `static.zdassets.com` | Zendesk static assets | Loads 10+ JavaScript chunks (each fetched twice) during widget initialization | Bursts of parallel requests reset the idle timer |
| `m.stripe.com` / `m.stripe.network` | Stripe telemetry | Sends telemetry pings (`/6`) at ~3.7-second intervals | Periodic requests that repeatedly break the quiet window |
| `www.google-analytics.com` | Google Analytics | Fires `page_view` collection events on navigation | Additional request noise; also observed with `net::ERR_ABORTED` failures |
| `www.googletagmanager.com` | Google Tag Manager | Loads tag container scripts that trigger further GA/analytics calls | Cascade source for additional third-party requests |

### Raw diagnostic timeline (abbreviated)

```
+65ms    Feathr API request starts
+309ms   Feathr API response received (244 ms total) ← app is ready
+491ms   Zendesk widget begins loading 10+ script chunks
+925ms   Zendesk opens long-poll config connection...
+3730ms  Stripe fires second telemetry ping
+3745ms  Google Analytics fires page_view event
+16247ms Zendesk long-poll finally completes (~15 seconds)
         ...by which point new Stripe/Zendesk requests may have fired
```

After a full 30-second observation window followed by an additional 5-second `networkidle` check, the state was still **not reached**.

### Failed requests

Four requests were observed failing with `net::ERR_ABORTED`:

- `POST feathr.zendesk.com/frontendevents/pv` (×2)
- `GET feathr.zendesk.com/embeddable/config` (×1)
- `POST www.google-analytics.com/g/collect` (×1)

These aborted requests generate further retries, adding to the network noise.

## Why these services are safe to block in tests

None of the identified third-party services participate in Feathr's core application logic:

- **Zendesk** provides the customer support chat widget. It is not exercised by any automated test scenario.
- **Stripe telemetry** (`m.stripe.com`) is Stripe's client-side fraud detection and analytics. It is distinct from Stripe payment API calls, which go through `api.stripe.com` and Feathr's own backend — those remain unblocked.
- **Google Analytics / Tag Manager** collects marketing analytics data. It has no bearing on application state or test assertions.

Blocking these domains in the test environment:

1. Does **not** affect any Feathr API call or application behavior under test.
2. Eliminates the primary source of `networkidle` timeouts.
3. Removes non-deterministic third-party latency from test execution.
4. Prevents aborted third-party requests from polluting failure diagnostics.

## Implementation

Route blocking is applied automatically via an `{ auto: true }` fixture in `lib/fixtures/helper-fixtures.ts`. Every test inherits it without code changes.

```typescript
const BLOCKED_THIRD_PARTY_PATTERN =
  /\.(zendesk\.com|zdassets\.com|stripe\.(com|network)|google-analytics\.com|googletagmanager\.com)\//;

blockThirdPartyNoise: [
  async ({ page }, use) => {
    await page.route(BLOCKED_THIRD_PARTY_PATTERN, (route) => route.abort());
    await use();
  },
  { auto: true },
],
```

All `page.waitForLoadState('networkidle')` calls across test suites have been replaced with `page.waitForLoadState('domcontentloaded')`, since the dashboard is confirmed interactive well before `networkidle` would resolve — and with third-party noise blocked, the distinction is minimal.

## Best practice reference

The Playwright documentation explicitly advises against relying on `networkidle` for modern web applications:

> **Discouraged**: Don't use `waitForLoadState('networkidle')` unless you have a specific reason. Relying on it leads to flaky tests. It is not suitable for apps that rely on WebSockets, long-polling, server-sent events, or any form of background network activity.
>
> — [Playwright docs: Auto-waiting](https://playwright.dev/docs/actionability)

The recommended approach is to wait for **meaningful application state** (visible elements, URL changes, API responses) rather than the absence of network activity. This project's `beforeEach` blocks already assert that `dashboardPage.nav_homeLink` is visible before proceeding, which is a reliable readiness signal.

## Maintenance

If additional third-party services are embedded in Feathr in the future and cause similar issues, run the network diagnostic:

```bash
npx playwright test tests/diagnostics/network-idle-diagnostic.spec.ts --headed
```

Review the report and add new domains to `BLOCKED_THIRD_PARTY_PATTERN` in `helper-fixtures.ts` as needed. If a blocked domain is ever needed for a specific test scenario (e.g., testing the Zendesk widget itself), that test can unroute the pattern:

```typescript
await page.unroute(BLOCKED_THIRD_PARTY_PATTERN);
```
