import { AllureHelper } from '../utils/allure-helper';

/**
 * Prefixes Playwright `test.step` titles with a stable step number so custom reporting can
 * map failures back to manual or documented workflow steps.
 */
export function manualStepTitle(stepNumber: number, title: string): string {
  return AllureHelper.manualStepTitle(stepNumber, title);
}

export async function manualStep<T>(
  stepNumber: number,
  title: string,
  action: () => Promise<T>,
  details?: string | Record<string, unknown>
): Promise<T> {
  return AllureHelper.manualStep(stepNumber, title, action, details);
}
