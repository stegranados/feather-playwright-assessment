# CI/CD Integration

This framework includes a GitHub Actions workflow for automated testing.

## GitHub Actions Workflow

Location: `.github/workflows/playwright-tests.yml`

### Manual Trigger

Run tests manually from GitHub Actions UI:

1. Go to **Actions** tab in your repository
2. Select **Playwright Tests** workflow
3. Click **Run workflow**
4. Configure options:
   - **Branch**: Branch to run tests on (default: `main`)
   - **Test case**: Specific test file (leave empty for all)
   - **Workers**: Parallel workers (default: `1`)
   - **Retries**: Retry count for failures (default: `2`)

### Scheduled Runs

To enable automatic scheduled runs, uncomment the schedule section in the workflow:

```yaml
on:
  # Uncomment below to enable scheduled runs
  schedule:
    - cron: "0 3 * * *"  # Every day at 3:00 AM UTC
```

**Cron Examples:**

| Schedule | Cron Expression |
|----------|-----------------|
| Daily at 3 AM UTC | `0 3 * * *` |
| Every 6 hours | `0 */6 * * *` |
| Weekdays at 9 AM UTC | `0 9 * * 1-5` |
| First of month | `0 0 1 * *` |
| Sundays at 2:30 PM UTC | `30 14 * * 0` |

## Required Secrets

Configure these secrets in your GitHub repository:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add the following secrets:

| Secret | Description |
|--------|-------------|
| `BASE_URL` | Application URL |
| `TEST_USER_EMAIL` | Test user email |
| `TEST_USER_PASSWORD` | Test user password |

### Adding a Secret

1. Click **New repository secret**
2. Enter the secret name (e.g., `BASE_URL`)
3. Enter the secret value
4. Click **Add secret**

## Artifacts

The workflow uploads three artifacts:

| Artifact | Content | Retention |
|----------|---------|-----------|
| `playwright-report` | Playwright HTML report | 30 days |
| `allure-results` | Allure raw results | 30 days |
| `test-results` | Screenshots, videos, traces | 30 days |

### Downloading Artifacts

1. Go to **Actions** tab
2. Click on the workflow run
3. Scroll to **Artifacts** section
4. Click to download

### Viewing Playwright Report

1. Download `playwright-report` artifact
2. Extract the zip file
3. Open `index.html` in a browser

### Generating Allure Report from Artifacts

1. Download `allure-results` artifact
2. Extract to your local `allure-results/` folder
3. Run:

```bash
npm run allure:generate
npm run allure:open
```

## Multi-Browser CI Setup

To run tests on multiple browsers in CI:

```yaml
- name: Install all browsers
  run: npx playwright install chromium firefox webkit --with-deps

- name: Run tests on all browsers
  run: npx playwright test
```

Or run browsers in parallel jobs:

```yaml
jobs:
  test:
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - name: Install browser
        run: npx playwright install ${{ matrix.browser }} --with-deps
      
      - name: Run tests
        run: npx playwright test --project=${{ matrix.browser }}
```

## Workflow Customization

### Adding Environment Variables

```yaml
env:
  BASE_URL: ${{ secrets.BASE_URL }}
  MY_CUSTOM_VAR: ${{ secrets.MY_CUSTOM_VAR }}
```

### Running Specific Tests

```yaml
- name: Run smoke tests
  run: npx playwright test --grep @smoke
```

### Changing Timeout

```yaml
jobs:
  playwright-tests:
    timeout-minutes: 60  # Reduce from 180 to 60 minutes
```

### Adding Slack Notification

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Playwright tests failed on ${{ github.ref }}"
      }
```

## Local CI Simulation

Test the CI workflow locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act

# Run workflow
act workflow_dispatch -s BASE_URL=http://localhost:3000
```

## Troubleshooting CI

### Tests Pass Locally but Fail in CI

- Check if `BASE_URL` secret is set correctly
- Verify browser installation: `npx playwright install --with-deps`
- Increase timeouts for slower CI environment
- Check for timezone-dependent tests

### Artifacts Not Uploading

- Ensure `if: always()` is set on upload steps
- Check artifact paths exist
- Verify retention-days is set

### Out of Memory

- Reduce workers: `--workers=1`
- Run browsers sequentially instead of parallel
- Use `--shard` for large test suites

### Timeout Issues

- Increase `timeout-minutes` in the job
- Add retries for flaky tests
- Check for network issues in CI environment
