import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, '..');
const allureResultsDirectory = path.join(workspaceRoot, 'allure-results');
const allureResultsHistoryDirectory = path.join(allureResultsDirectory, 'history');
const allureReportDirectory = path.join(workspaceRoot, 'allure-report');
const allureReportHistoryDirectory = path.join(allureReportDirectory, 'history');
const executorPath = path.join(allureResultsDirectory, 'executor.json');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyPreviousHistory() {
  const hasPreviousHistory = await pathExists(allureReportHistoryDirectory);
  await fs.mkdir(allureResultsDirectory, { recursive: true });

  if (!hasPreviousHistory) {
    console.log('[allure-history] No previous allure-report/history found. Starting a new history chain.');
    return;
  }

  await fs.rm(allureResultsHistoryDirectory, { recursive: true, force: true });
  await fs.mkdir(allureResultsHistoryDirectory, { recursive: true });
  await fs.cp(allureReportHistoryDirectory, allureResultsHistoryDirectory, {
    recursive: true,
    force: true,
  });
  console.log('[allure-history] Copied previous history into allure-results/history.');
}

async function writeExecutorMetadata() {
  const startedAt = new Date();
  const executor = {
    name: 'local',
    type: 'local',
    buildName: `Local run ${startedAt.toISOString()}`,
    buildOrder: Date.now(),
    reportName: 'Local Allure Report',
  };

  await fs.writeFile(executorPath, `${JSON.stringify(executor, null, 2)}\n`, 'utf8');
  console.log('[allure-history] Wrote allure-results/executor.json.');
}

async function main() {
  await copyPreviousHistory();
  await writeExecutorMetadata();
}

main().catch((error) => {
  console.error('[allure-history] Failed to prepare local Allure history.');
  console.error(error);
  process.exit(1);
});
