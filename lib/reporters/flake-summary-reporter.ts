import * as fs from 'fs';
import * as path from 'path';
import type { FullResult, Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

const DIAGNOSTIC_ATTACHMENTS = [
  'console-errors',
  'page-errors',
  'network-issues',
  'slow-responses',
] as const;

type FailureRecord = {
  titlePath: string;
  errorSnippet: string;
  attachmentText: Record<string, string>;
  manualStepDisplay: string;
};

type PerTestExecutionSummary = {
  titlePath: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  interrupted: number;
  failureReasonCounts: Map<string, number>;
};

const CLUSTER_LABELS: Record<string, string> = {
  http_5xx: 'HTTP 5xx / server errors',
  http_401_403: 'HTTP 401 / 403 (auth/session)',
  frontend_pageerror: 'Frontend runtime (pageerror)',
  console_error: 'Console error/warning',
  slow_network: 'Slow network (>3s)',
  test_timeout: 'Playwright timeout',
  assertion_grid_poll: 'Grid / polling assertion',
  assertion_other: 'Other assertion failure',
  unknown: 'Unknown / unmatched',
};

function readAttachmentText(att: TestResult['attachments'][number]): string {
  if (att.body?.length) {
    return att.body.toString('utf-8');
  }
  if (att.path && fs.existsSync(att.path)) {
    return fs.readFileSync(att.path, 'utf-8');
  }
  return '';
}

function stepDepth(step: TestStep): number {
  let depth = 0;
  let parentStep = step.parent;
  while (parentStep) {
    depth += 1;
    parentStep = parentStep.parent;
  }
  return depth;
}

function findDeepestStepWithError(steps: TestStep[]): TestStep | undefined {
  let deepestStep: TestStep | undefined;
  let deepestDepth = -1;

  const visit = (step: TestStep) => {
    if (step.error) {
      const currentDepth = stepDepth(step);
      if (currentDepth > deepestDepth) {
        deepestDepth = currentDepth;
        deepestStep = step;
      }
    }

    for (const childStep of step.steps) {
      visit(childStep);
    }
  };

  for (const step of steps) {
    visit(step);
  }

  return deepestStep;
}

const MANUAL_STEP_PREFIX = /^\[Step\s+(\d+)\]\s*(.*)$/i;

function parseManualStepTitle(title: string): { number: number; rest: string } | null {
  const match = title.match(MANUAL_STEP_PREFIX);
  if (!match) {
    return null;
  }

  return { number: Number(match[1]), rest: (match[2] ?? '').trim() || title };
}

function resolveManualStepDisplay(result: TestResult): string {
  const deepestStep = findDeepestStepWithError(result.steps);
  if (!deepestStep) {
    return '— (failure outside Playwright step tree)';
  }

  let currentStep: TestStep | undefined = deepestStep;
  while (currentStep) {
    if (currentStep.category === 'test.step') {
      const parsedStep = parseManualStepTitle(currentStep.title);
      if (parsedStep) {
        const clippedTitle =
          parsedStep.rest.length > 72
            ? `${parsedStep.rest.slice(0, 69)}…`
            : parsedStep.rest;
        return `${parsedStep.number} — ${clippedTitle}`;
      }
    }
    currentStep = currentStep.parent;
  }

  const fallbackTitle =
    deepestStep.title.length > 80
      ? `${deepestStep.title.slice(0, 77)}…`
      : deepestStep.title;
  return `— (${fallbackTitle})`;
}

function categorizeFailure(failure: FailureRecord): string {
  const networkIssues = failure.attachmentText['network-issues'] ?? '';
  const slowResponses = failure.attachmentText['slow-responses'] ?? '';
  const pageErrors = failure.attachmentText['page-errors'] ?? '';
  const consoleErrors = failure.attachmentText['console-errors'] ?? '';
  const errorMessage = failure.errorSnippet;

  if (/test timeout of .* exceeded|timed out/i.test(errorMessage)) return 'test_timeout';
  if (/\b5\d\d\b/.test(networkIssues)) return 'http_5xx';
  if (/\b401\b|\b403\b/.test(networkIssues)) return 'http_401_403';
  if (pageErrors.trim().length > 0) return 'frontend_pageerror';
  if (consoleErrors.trim().length > 0) return 'console_error';
  if (slowResponses.trim().length > 0) return 'slow_network';
  if (/toBeGreaterThan|mktgrid_|cloneRows|expectDraftCloneCountIncreased|row\.count/i.test(errorMessage)) {
    return 'assertion_grid_poll';
  }
  if (/expect\(/i.test(errorMessage)) return 'assertion_other';
  return 'unknown';
}

function topEvidence(failure: FailureRecord): string[] {
  const evidence: string[] = [];
  const networkIssues = failure.attachmentText['network-issues'];
  if (networkIssues) {
    evidence.push(...networkIssues.split('\n').filter(Boolean).slice(0, 2));
  }

  const pageErrors = failure.attachmentText['page-errors'];
  if (pageErrors) {
    evidence.push(...pageErrors.split('\n').filter(Boolean).slice(0, 1));
  }

  const firstErrorLine = failure.errorSnippet
    .split('\n')
    .find((line) => line.trim().length > 0);
  if (firstErrorLine) {
    evidence.push(firstErrorLine.trim());
  }

  return [...new Set(evidence)].slice(0, 3);
}

export default class FlakeSummaryReporter implements Reporter {
  private failures: FailureRecord[] = [];

  private perTestExecution = new Map<string, PerTestExecutionSummary>();

  private readonly repeatEachArg = this.resolveRepeatEachArg();

  private readonly startedAt = new Date();

  onTestEnd(test: TestCase, result: TestResult) {
    const titlePath = test.titlePath().join(' › ');
    this.recordPerTestExecution(titlePath, result.status);

    if (result.status !== 'failed' && result.status !== 'timedOut') {
      return;
    }

    const attachmentText: Record<string, string> = {};
    for (const attachment of result.attachments) {
      if (
        !attachment.name ||
        !DIAGNOSTIC_ATTACHMENTS.includes(
          attachment.name as (typeof DIAGNOSTIC_ATTACHMENTS)[number]
        )
      ) {
        continue;
      }

      const text = readAttachmentText(attachment);
      if (text.length > 0) {
        attachmentText[attachment.name] = text;
      }
    }

    const errorMessage = result.error?.message ?? '';
    const failureRecord: FailureRecord = {
      titlePath,
      errorSnippet: errorMessage.split('\n').slice(0, 8).join('\n'),
      attachmentText,
      manualStepDisplay: resolveManualStepDisplay(result),
    };

    const failureCategoryId = categorizeFailure(failureRecord);
    const failureCategoryLabel = CLUSTER_LABELS[failureCategoryId] ?? failureCategoryId;
    const summary = this.perTestExecution.get(titlePath);
    if (summary) {
      summary.failureReasonCounts.set(
        failureCategoryLabel,
        (summary.failureReasonCounts.get(failureCategoryLabel) ?? 0) + 1
      );
    }

    this.failures.push(failureRecord);
  }

  onEnd(_result: FullResult) {
    const rows = this.buildClusterRows();
    const markdown = this.buildMarkdown(rows);
    const outputDirectory = path.join(process.cwd(), 'test-results');
    fs.mkdirSync(outputDirectory, { recursive: true });

    const outputPath = path.join(outputDirectory, 'flake-summary.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(
      `[flake-summary] Wrote ${outputPath} (failures: ${this.failures.length}, clusters: ${rows.length})`
    );
  }

  private buildClusterRows(): {
    clusterId: string;
    label: string;
    count: number;
    tests: string[];
    evidenceLines: string[];
    manualStepSummary: string;
  }[] {
    const failuresByCluster = new Map<
      string,
      {
        count: number;
        tests: Set<string>;
        evidenceCounts: Map<string, number>;
        manualStepCounts: Map<string, number>;
      }
    >();

    for (const failure of this.failures) {
      const clusterId = categorizeFailure(failure);
      if (!failuresByCluster.has(clusterId)) {
        failuresByCluster.set(clusterId, {
          count: 0,
          tests: new Set(),
          evidenceCounts: new Map(),
          manualStepCounts: new Map(),
        });
      }

      const bucket = failuresByCluster.get(clusterId)!;
      bucket.count += 1;
      bucket.tests.add(failure.titlePath);

      for (const evidenceLine of topEvidence(failure)) {
        const normalizedLine =
          evidenceLine.length > 200
            ? `${evidenceLine.slice(0, 197)}…`
            : evidenceLine;
        bucket.evidenceCounts.set(
          normalizedLine,
          (bucket.evidenceCounts.get(normalizedLine) ?? 0) + 1
        );
      }

      const stepKey = failure.manualStepDisplay;
      bucket.manualStepCounts.set(stepKey, (bucket.manualStepCounts.get(stepKey) ?? 0) + 1);
    }

    const rows: {
      clusterId: string;
      label: string;
      count: number;
      tests: string[];
      evidenceLines: string[];
      manualStepSummary: string;
    }[] = [];

    for (const [clusterId, data] of failuresByCluster) {
      const sortedEvidence = [...data.evidenceCounts.entries()].sort((a, b) => b[1] - a[1]);
      const sortedSteps = [...data.manualStepCounts.entries()].sort((a, b) => b[1] - a[1]);

      rows.push({
        clusterId,
        label: CLUSTER_LABELS[clusterId] ?? clusterId,
        count: data.count,
        tests: [...data.tests].sort(),
        evidenceLines: sortedEvidence.slice(0, 3).map(([line]) => line),
        manualStepSummary:
          sortedSteps
            .slice(0, 4)
            .map(([label, count]) => (count > 1 ? `${label} (×${count})` : label))
            .join('<br>') || '—',
      });
    }

    rows.sort((a, b) => b.count - a.count);
    return rows;
  }

  private buildMarkdown(
    rows: {
      clusterId: string;
      label: string;
      count: number;
      tests: string[];
      evidenceLines: string[];
      manualStepSummary: string;
    }[]
  ): string {
    const lines: string[] = [];
    const totalInvocations = [...this.perTestExecution.values()].reduce(
      (sum, row) => sum + row.total,
      0
    );
    const passedInvocations = [...this.perTestExecution.values()].reduce(
      (sum, row) => sum + row.passed,
      0
    );
    const failedInvocations = [...this.perTestExecution.values()].reduce(
      (sum, row) => sum + row.failed,
      0
    );

    lines.push('# Flake / failure summary');
    lines.push('');
    lines.push(`- Generated: ${this.startedAt.toISOString()}`);
    if (this.repeatEachArg !== null) {
      lines.push(`- Detected repeat-each: ${this.repeatEachArg}`);
    }
    lines.push(`- Total test invocations executed: ${totalInvocations}`);
    lines.push(`- Passed invocations: ${passedInvocations}`);
    lines.push(`- Failed invocations (failed + timedOut): ${failedInvocations}`);
    lines.push(`- Total failed invocations: ${this.failures.length}`);
    lines.push('- Numbered steps use `[Step N]` in Playwright `test.step` titles.');
    lines.push('');
    lines.push('## Symptom clusters');
    lines.push('');
    lines.push('| Symptom cluster | Count | Affected manual step(s) | Affected tests | Common evidence |');
    lines.push('| --- | ---: | --- | --- | --- |');

    if (rows.length === 0) {
      lines.push('| — | 0 | — | — | No failures in this run |');
    } else {
      for (const row of rows) {
        const testsCell = row.tests.map((testTitle) => `\`${testTitle.replace(/`/g, "'")}\``).join('<br>');
        const evidenceCell = row.evidenceLines
          .map((evidenceLine) => evidenceLine.replace(/\|/g, '\\|'))
          .join('<br>');
        const stepCell = row.manualStepSummary.replace(/\|/g, '\\|');
        lines.push(`| ${row.label} | ${row.count} | ${stepCell} | ${testsCell} | ${evidenceCell} |`);
      }
    }

    if (this.failures.length > 0) {
      lines.push('');
      lines.push('## Failed invocations (step-level)');
      lines.push('');
      lines.push('| Manual step (resolved) | Symptom cluster | Test |');
      lines.push('| --- | --- | --- |');

      for (const failure of this.failures) {
        const clusterLabel = CLUSTER_LABELS[categorizeFailure(failure)] ?? categorizeFailure(failure);
        const stepCell = failure.manualStepDisplay.replace(/\|/g, '\\|');
        const testCell = `\`${failure.titlePath.replace(/`/g, "'")}\``;
        lines.push(`| ${stepCell} | ${clusterLabel} | ${testCell} |`);
      }
    }

    lines.push('');
    lines.push('## Per-test execution summary');
    lines.push('');
    lines.push('| Test | Total runs | Passed | Failed | Flake score | Failure reasons (count) |');
    lines.push('| --- | ---: | ---: | ---: | ---: | --- |');

    const executionRows = [...this.perTestExecution.values()].sort((a, b) => {
      if (b.failed !== a.failed) {
        return b.failed - a.failed;
      }
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      return a.titlePath.localeCompare(b.titlePath);
    });

    if (executionRows.length === 0) {
      lines.push('| — | 0 | 0 | 0 | 0.0% | — |');
    } else {
      for (const row of executionRows) {
        const reasons = [...row.failureReasonCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([reason, count]) => `${reason} (×${count})`)
          .join('<br>');
        const reasonsCell = row.failed > 0 ? reasons || '—' : '—';
        const flakeScore =
          row.total > 0 ? `${((row.failed / row.total) * 100).toFixed(1)}%` : '0.0%';
        lines.push(
          `| \`${row.titlePath.replace(/`/g, "'")}\` | ${row.total} | ${row.passed} | ${row.failed} | ${flakeScore} | ${reasonsCell} |`
        );
      }
    }

    lines.push('');
    lines.push('## Heuristic rules (v1)');
    lines.push('');
    lines.push('- `test_timeout`: failure message indicates Playwright timeout');
    lines.push('- `http_5xx`: `network-issues` contains status 5xx');
    lines.push('- `http_401_403`: `network-issues` contains 401 or 403');
    lines.push('- `frontend_pageerror`: `page-errors` non-empty');
    lines.push('- `console_error`: `console-errors` non-empty');
    lines.push('- `slow_network`: `slow-responses` non-empty');
    lines.push('- `assertion_grid_poll`: error text matches grid or polling helpers');
    lines.push('- `assertion_other`: other `expect(` failures');
    lines.push('- `unknown`: fallback');
    lines.push('');

    return lines.join('\n');
  }

  private recordPerTestExecution(
    titlePath: string,
    status: TestResult['status']
  ): void {
    if (!this.perTestExecution.has(titlePath)) {
      this.perTestExecution.set(titlePath, {
        titlePath,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        interrupted: 0,
        failureReasonCounts: new Map(),
      });
    }

    const row = this.perTestExecution.get(titlePath)!;
    row.total += 1;

    if (status === 'passed') {
      row.passed += 1;
      return;
    }
    if (status === 'failed' || status === 'timedOut') {
      row.failed += 1;
      return;
    }
    if (status === 'skipped') {
      row.skipped += 1;
      return;
    }

    row.interrupted += 1;
  }

  private resolveRepeatEachArg(): number | null {
    for (let i = 0; i < process.argv.length; i += 1) {
      const arg = process.argv[i];
      if (!arg) {
        continue;
      }

      if (arg === '--repeat-each') {
        const maybeValue = process.argv[i + 1];
        if (!maybeValue) {
          return null;
        }
        const parsed = Number(maybeValue);
        return Number.isFinite(parsed) ? parsed : null;
      }

      if (arg.startsWith('--repeat-each=')) {
        const parsed = Number(arg.slice('--repeat-each='.length));
        return Number.isFinite(parsed) ? parsed : null;
      }
    }

    return null;
  }
}
