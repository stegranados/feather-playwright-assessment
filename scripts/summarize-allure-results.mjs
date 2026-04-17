#!/usr/bin/env node
/**
 * Build a flake-style markdown summary from Allure *-result.json files
 * (same heuristics as lib/reporters/flake-summary-reporter.ts).
 *
 * Usage:
 *   node scripts/summarize-allure-results.mjs
 *   node scripts/summarize-allure-results.mjs --input path/to/allure-results --out path/to/out.md
 *   node scripts/summarize-allure-results.mjs --out ./allure-failure-summary.md
 *     → also writes ./allure-executive-summary.md (override with --executive-out, skip with --no-executive)
 */

import * as fs from 'fs';
import * as path from 'path';
const DIAGNOSTIC_NAMES = new Set([
  'console-errors',
  'page-errors',
  'network-issues',
  'slow-responses',
]);

const CLUSTER_LABELS = {
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

function parseArgs(argv) {
  let inputDir = path.join(process.cwd(), 'allure-results');
  let outPath = path.join(process.cwd(), 'test-results', 'allure-failure-summary.md');
  /** @type {string | null} null = derive from outPath */
  let executiveOutExplicit = null;
  let noExecutive = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' && argv[i + 1]) {
      inputDir = path.resolve(argv[++i]);
    } else if (a === '--out' && argv[i + 1]) {
      outPath = path.resolve(argv[++i]);
    } else if (a === '--executive-out' && argv[i + 1]) {
      executiveOutExplicit = path.resolve(argv[++i]);
    } else if (a === '--no-executive') {
      noExecutive = true;
    } else if (a === '--help' || a === '-h') {
      console.log(
        `Usage: node scripts/summarize-allure-results.mjs [--input DIR] [--out FILE] [--executive-out FILE] [--no-executive]`,
      );
      process.exit(0);
    }
  }
  const executiveOut = noExecutive
    ? null
    : executiveOutExplicit ?? path.join(path.dirname(outPath), 'allure-executive-summary.md');
  return { inputDir, outPath, executiveOut };
}

/**
 * @param {object} opts
 * @param {string} opts.generatedAt
 * @param {string} opts.inputDir
 * @param {number} opts.resultFilesCount
 * @param {number} opts.passedCount
 * @param {number} opts.failedCount
 * @param {number} opts.brokenCount
 * @param {number} opts.skippedCount
 * @param {number} opts.failureRecords
 * @param {Array<{ label: string, count: number, evidenceLines: string[], tests: string[] }>} opts.clusterRowsSorted
 */
function buildExecutiveSummaryMd(opts) {
  const {
    generatedAt,
    inputDir,
    resultFilesCount,
    passedCount,
    failedCount,
    brokenCount,
    skippedCount,
    failureRecords,
    clusterRowsSorted,
  } = opts;

  const lines = [];
  lines.push('# Executive summary — failure themes');
  lines.push('');
  lines.push(`- **Generated:** ${generatedAt}`);
  lines.push(`- **Source:** \`${inputDir}\``);
  lines.push(
    `- **Executions in this slice:** ${resultFilesCount} result file(s) — ${passedCount} passed, ${failedCount} failed, ${brokenCount} broken, ${skippedCount} skipped.`,
  );
  lines.push(
    `- **Failed / broken invocations:** ${failureRecords} (used as the denominator for “share of failures” below).`,
  );
  lines.push('');

  if (failureRecords === 0) {
    lines.push('No failed or broken test results in this Allure slice — nothing to rank.');
    lines.push('');
    return lines.join('\n');
  }

  const top = clusterRowsSorted.slice(0, 2);
  const topCountSum = top.reduce((s, r) => s + r.count, 0);
  const otherFailures = Math.max(0, failureRecords - topCountSum);

  lines.push('## Top two themes (by failed-invocation count)');
  lines.push('');
  lines.push(
    '| Rank | Theme | Failures | % of all failures | % of all executions | Distinct tests | Representative signal |',
  );
  lines.push('| ---: | --- | ---: | ---: | ---: | ---: | --- |');

  for (let i = 0; i < top.length; i++) {
    const row = top[i];
    const pctFailures = ((row.count / failureRecords) * 100).toFixed(1);
    const pctRuns = ((row.count / resultFilesCount) * 100).toFixed(1);
    const distinct = row.tests.length;
    const rawSig = (row.evidenceLines[0] ?? '—').replace(/\|/g, '\\|');
    const signal = rawSig.length > 120 ? `${rawSig.slice(0, 117)}…` : rawSig;
    lines.push(
      `| ${i + 1} | ${row.label} | ${row.count} | ${pctFailures}% | ${pctRuns}% | ${distinct} | ${signal} |`,
    );
  }

  lines.push('');
  lines.push('### Quick read');
  lines.push('');
  if (top.length >= 1) {
    const r1 = top[0];
    const pct1f = ((r1.count / failureRecords) * 100).toFixed(1);
    const pct1r = ((r1.count / resultFilesCount) * 100).toFixed(1);
    lines.push(
      `1. **${r1.label}** — ${r1.count} failure invocation(s): **${pct1f}%** of all failures, **${pct1r}%** of every execution in this export.`,
    );
  }
  if (top.length >= 2) {
    const r2 = top[1];
    const pct2f = ((r2.count / failureRecords) * 100).toFixed(1);
    const pct2r = ((r2.count / resultFilesCount) * 100).toFixed(1);
    lines.push(
      `2. **${r2.label}** — ${r2.count} failure invocation(s): **${pct2f}%** of all failures, **${pct2r}%** of every execution in this export.`,
    );
  }

  if (otherFailures > 0) {
    const pctOtherF = ((otherFailures / failureRecords) * 100).toFixed(1);
    const pctOtherR = ((otherFailures / resultFilesCount) * 100).toFixed(1);
    lines.push('');
    lines.push('## Other themes (combined)');
    lines.push('');
    lines.push(
      `Additional failure invocations not in the top two: **${otherFailures}** (**${pctOtherF}%** of failures, **${pctOtherR}%** of executions). See the detailed report for full cluster breakdown.`,
    );
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(
    '_Share of failures_ = cluster count ÷ total failed/broken invocations. _Share of executions_ = cluster count ÷ number of `*-result.json` files (one file ≈ one outcome).',
  );
  lines.push('');
  return lines.join('\n');
}

function readAttachment(resultsDir, source) {
  if (!source) return '';
  const fp = path.join(resultsDir, source);
  try {
    return fs.readFileSync(fp, 'utf-8');
  } catch {
    return '';
  }
}

function* walkSteps(steps) {
  if (!Array.isArray(steps)) return;
  for (const s of steps) {
    yield s;
    yield* walkSteps(s.steps);
  }
}

function collectDiagnosticText(result, resultsDir) {
  const attachmentText = {};
  const visitAttachments = (attachments) => {
    if (!Array.isArray(attachments)) return;
    for (const att of attachments) {
      const name = att.name;
      if (!name || !DIAGNOSTIC_NAMES.has(name)) continue;
      const body = readAttachment(resultsDir, att.source);
      if (body.length > 0) attachmentText[name] = body;
    }
  };
  visitAttachments(result.attachments);
  for (const step of walkSteps(result.steps)) {
    visitAttachments(step.attachments);
  }
  return attachmentText;
}

function getTitlePath(result) {
  /** @type {string[]} */
  let parts = [];
  if (Array.isArray(result.titlePath) && result.titlePath.length > 0) {
    parts = [...result.titlePath];
  } else {
    const label = result.labels?.find((l) => l.name === 'titlePath');
    if (label?.value) {
      const stripped = label.value.replace(/^[^>]*>\s*chromium\s*>\s*/i, '').trim();
      parts = stripped ? stripped.split(/\s*>\s*/) : [];
    }
  }
  const testTitle = result.name?.trim();
  if (testTitle && (!parts.length || parts[parts.length - 1] !== testTitle)) {
    parts.push(testTitle);
  }
  if (parts.length > 0) {
    return parts.join(' › ');
  }
  return result.fullName || result.name || 'unknown';
}

function findDeepestFailedStep(steps) {
  let best = null;
  let bestDepth = -1;
  const visit = (step, d) => {
    if (step.status === 'failed' && step.statusDetails?.message) {
      if (d > bestDepth) {
        bestDepth = d;
        best = step;
      }
    }
    for (const c of step.steps || []) visit(c, d + 1);
  };
  for (const s of steps || []) visit(s, 0);
  return best;
}

const MANUAL_STEP_PREFIX = /^\[Step\s+(\d+)\]\s*(.*)$/i;

function resolveManualStepDisplay(result) {
  const rootSteps = result.steps || [];
  const deepest = findDeepestFailedStep(rootSteps);
  if (!deepest) {
    return '— (failure outside step tree)';
  }
  let current = deepest;
  while (current) {
    const title = current.name || '';
    const match = title.match(MANUAL_STEP_PREFIX);
    if (match) {
      const rest = (match[2] ?? '').trim() || title;
      const clipped = rest.length > 72 ? `${rest.slice(0, 69)}…` : rest;
      return `${match[1]} — ${clipped}`;
    }
    current = findParentStep(rootSteps, current);
  }
  const fallback = (deepest.name || '').length > 80 ? `${(deepest.name || '').slice(0, 77)}…` : deepest.name || '';
  return `— (${fallback})`;
}

function findParentStep(steps, target) {
  function search(arr) {
    if (!Array.isArray(arr)) return null;
    for (const s of arr) {
      if (s.steps?.includes(target)) return s;
      const found = search(s.steps);
      if (found) return found;
    }
    return null;
  }
  return search(steps);
}

function categorizeFailure({ errorSnippet, attachmentText }) {
  const networkIssues = attachmentText['network-issues'] ?? '';
  const slowResponses = attachmentText['slow-responses'] ?? '';
  const pageErrors = attachmentText['page-errors'] ?? '';
  const consoleErrors = attachmentText['console-errors'] ?? '';
  const errorMessage = errorSnippet;

  if (/test timeout of .* exceeded|timed out/i.test(errorMessage)) return 'test_timeout';
  if (/\b5\d\d\b/.test(networkIssues)) return 'http_5xx';
  if (/\b401\b|\b403\b/.test(networkIssues)) return 'http_401_403';
  if (pageErrors.trim().length > 0) return 'frontend_pageerror';
  if (consoleErrors.trim().length > 0) return 'console_error';
  if (slowResponses.trim().length > 0) return 'slow_network';
  if (
    /toBeGreaterThan|mktgrid_|cloneRows|expectDraftCloneCountIncreased|row\.count/i.test(errorMessage)
  ) {
    return 'assertion_grid_poll';
  }
  if (/expect\(/i.test(errorMessage)) return 'assertion_other';
  return 'unknown';
}

function topEvidence(failure) {
  const evidence = [];
  const networkIssues = failure.attachmentText['network-issues'];
  if (networkIssues) {
    evidence.push(...networkIssues.split('\n').filter(Boolean).slice(0, 2));
  }
  const pageErrors = failure.attachmentText['page-errors'];
  if (pageErrors) {
    evidence.push(...pageErrors.split('\n').filter(Boolean).slice(0, 1));
  }
  const firstErrorLine = failure.errorSnippet.split('\n').find((line) => line.trim().length > 0);
  if (firstErrorLine) evidence.push(firstErrorLine.trim());
  return [...new Set(evidence)].slice(0, 3);
}

function loadResultFiles(inputDir) {
  if (!fs.existsSync(inputDir)) {
    console.error(`[allure-summarize] Input directory not found: ${inputDir}`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(inputDir)
    .filter((f) => f.endsWith('-result.json'))
    .map((f) => path.join(inputDir, f));
  return files.sort();
}

function main() {
  const { inputDir, outPath, executiveOut } = parseArgs(process.argv);
  const resultFiles = loadResultFiles(inputDir);

  /** @type {{ titlePath: string, errorSnippet: string, attachmentText: Record<string, string>, manualStepDisplay: string }[]} */
  const failures = [];
  /** @type {Map<string, { titlePath: string, total: number, passed: number, failed: number, skipped: number, failureReasonCounts: Map<string, number> }>} */
  const perTest = new Map();

  let passedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let brokenCount = 0;
  let otherCount = 0;

  for (const fp of resultFiles) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    } catch (e) {
      console.warn(`[allure-summarize] Skip invalid JSON: ${fp}`);
      continue;
    }

    const status = raw.status;
    const titlePath = getTitlePath(raw);

    if (!perTest.has(titlePath)) {
      perTest.set(titlePath, {
        titlePath,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        failureReasonCounts: new Map(),
      });
    }
    const row = perTest.get(titlePath);
    row.total += 1;

    if (status === 'passed') {
      row.passed += 1;
      passedCount += 1;
      continue;
    }
    if (status === 'skipped') {
      row.skipped += 1;
      skippedCount += 1;
      continue;
    }

    if (status === 'failed' || status === 'broken') {
      if (status === 'broken') brokenCount += 1;
      else failedCount += 1;

      const msg = raw.statusDetails?.message ?? '';
      const errorSnippet = msg.split('\n').slice(0, 8).join('\n');
      const attachmentText = collectDiagnosticText(raw, inputDir);
      const manualStepDisplay = resolveManualStepDisplay(raw);
      const failureRecord = { titlePath, errorSnippet, attachmentText, manualStepDisplay };
      failures.push(failureRecord);
      row.failed += 1;

      const clusterId = categorizeFailure(failureRecord);
      const label = CLUSTER_LABELS[clusterId] ?? clusterId;
      row.failureReasonCounts.set(label, (row.failureReasonCounts.get(label) ?? 0) + 1);
      continue;
    }

    otherCount += 1;
  }

  /** Cluster rows */
  const failuresByCluster = new Map();
  for (const failure of failures) {
    const clusterId = categorizeFailure(failure);
    if (!failuresByCluster.has(clusterId)) {
      failuresByCluster.set(clusterId, {
        count: 0,
        tests: new Set(),
        evidenceCounts: new Map(),
        manualStepCounts: new Map(),
      });
    }
    const bucket = failuresByCluster.get(clusterId);
    bucket.count += 1;
    bucket.tests.add(failure.titlePath);
    for (const evidenceLine of topEvidence(failure)) {
      const normalizedLine =
        evidenceLine.length > 200 ? `${evidenceLine.slice(0, 197)}…` : evidenceLine;
      bucket.evidenceCounts.set(normalizedLine, (bucket.evidenceCounts.get(normalizedLine) ?? 0) + 1);
    }
    const stepKey = failure.manualStepDisplay;
    bucket.manualStepCounts.set(stepKey, (bucket.manualStepCounts.get(stepKey) ?? 0) + 1);
  }

  const clusterRows = [...failuresByCluster.entries()]
    .map(([clusterId, data]) => ({
      clusterId,
      label: CLUSTER_LABELS[clusterId] ?? clusterId,
      count: data.count,
      tests: [...data.tests].sort(),
      evidenceLines: [...data.evidenceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([line]) => line),
      manualStepSummary:
        [...data.manualStepCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([label, c]) => (c > 1 ? `${label} (×${c})` : label))
          .join('<br>') || '—',
    }))
    .sort((a, b) => b.count - a.count);

  const generatedAt = new Date().toISOString();
  const lines = [];

  lines.push('# Allure results — failure / flake summary');
  lines.push('');
  lines.push(`- Generated: ${generatedAt}`);
  lines.push(`- Source: \`${inputDir}\``);
  lines.push(`- Result files scanned: ${resultFiles.length}`);
  lines.push(`- Outcomes: passed ${passedCount}, failed ${failedCount}, broken ${brokenCount}, skipped ${skippedCount}, other ${otherCount}`);
  lines.push(`- Failure records (failed + broken): ${failures.length}`);
  lines.push('- Clustering matches `lib/reporters/flake-summary-reporter.ts` heuristics.');
  lines.push('');

  lines.push('## Symptom clusters');
  lines.push('');
  lines.push('| Symptom cluster | Count | Affected manual step(s) | Affected tests | Common evidence |');
  lines.push('| --- | ---: | --- | --- | --- |');
  if (clusterRows.length === 0) {
    lines.push('| — | 0 | — | — | No failed/broken results |');
  } else {
    for (const row of clusterRows) {
      const testsCell = row.tests.map((t) => `\`${t.replace(/`/g, "'")}\``).join('<br>');
      const evidenceCell = row.evidenceLines.map((e) => e.replace(/\|/g, '\\|')).join('<br>');
      const stepCell = row.manualStepSummary.replace(/\|/g, '\\|');
      lines.push(`| ${row.label} | ${row.count} | ${stepCell} | ${testsCell} | ${evidenceCell} |`);
    }
  }

  if (failures.length > 0) {
    lines.push('');
    lines.push('## Failed / broken invocations');
    lines.push('');
    lines.push('| Manual step (resolved) | Symptom cluster | Test |');
    lines.push('| --- | --- | --- |');
    for (const failure of failures) {
      const cid = categorizeFailure(failure);
      const clusterLabel = CLUSTER_LABELS[cid] ?? cid;
      const stepCell = failure.manualStepDisplay.replace(/\|/g, '\\|');
      const testCell = `\`${failure.titlePath.replace(/`/g, "'")}\``;
      lines.push(`| ${stepCell} | ${clusterLabel} | ${testCell} |`);
    }
  }

  lines.push('');
  lines.push('## Per-test summary (from result files)');
  lines.push('');
  lines.push('| Test | Total | Passed | Failed | Flake score | Failure reasons (count) |');
  lines.push('| --- | ---: | ---: | ---: | ---: | --- |');

  const executionRows = [...perTest.values()].sort((a, b) => {
    if (b.failed !== a.failed) return b.failed - a.failed;
    if (b.total !== a.total) return b.total - a.total;
    return a.titlePath.localeCompare(b.titlePath);
  });

  for (const row of executionRows) {
    const reasons = [...row.failureReasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${reason} (×${count})`)
      .join('<br>');
    const reasonsCell = row.failed > 0 ? reasons || '—' : '—';
    const flakeScore = row.total > 0 ? `${((row.failed / row.total) * 100).toFixed(1)}%` : '0.0%';
    lines.push(
      `| \`${row.titlePath.replace(/`/g, "'")}\` | ${row.total} | ${row.passed} | ${row.failed} | ${flakeScore} | ${reasonsCell} |`,
    );
  }

  lines.push('');
  lines.push('## Heuristic rules');
  lines.push('');
  lines.push('Same as live `flake-summary.md`: timeout → HTTP from `network-issues` → page/console → slow → assertion patterns → unknown.');
  lines.push('');

  const md = lines.join('\n');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, 'utf-8');
  console.log(
    `[allure-summarize] Wrote ${outPath} (result files: ${resultFiles.length}, failures: ${failures.length}, clusters: ${clusterRows.length})`,
  );

  if (executiveOut) {
    const execMd = buildExecutiveSummaryMd({
      generatedAt,
      inputDir,
      resultFilesCount: resultFiles.length,
      passedCount,
      failedCount,
      brokenCount,
      skippedCount,
      failureRecords: failures.length,
      clusterRowsSorted: clusterRows,
    });
    fs.mkdirSync(path.dirname(executiveOut), { recursive: true });
    fs.writeFileSync(executiveOut, execMd, 'utf-8');
    console.log(`[allure-summarize] Wrote ${executiveOut}`);
  }
}

main();
