import { expect, test, type Page } from '@playwright/test';
import { CREATED_RESOURCE_URL } from '../lib/constants/marketing-urls';
import { getOptionalEnv } from '../lib/env';

/** Prefer a stable project label for the create wizard (comma-separated fallbacks in env). */
const DEFAULT_PROJECT_PICK = 'Test';

/** Ads types that use “Select an objective” after the name step. */
const WIZARD_HAS_OBJECTIVE_STEP = new Set([
  'Pixl Plus',
  'Mobile Geofencing',
  'Historical Geofencing',
  'Search Keyword',
  'Lookalike',
  'Affinity',
  'Retargeting',
  'Email Mapping',
]);

/** Wizards that need bounded stepping after the name screen (simple + automation email). */
const MULTI_STEP_FINISH_MODAL = new Set([
  'Single Send',
  'Auto Send',
  'Smart Send',
  'Drip',
  'Tracked Link',
  'Conversation',
]);

export class CreateCampaignWizardPage {
  constructor(private readonly page: Page) {}

  private get createDialog() {
    return this.page.getByRole('dialog', { name: 'Create a campaign' });
  }

  async chooseCampaignType(key: string, namePattern: RegExp): Promise<void> {
    const typeButton = this.page.getByRole('button', { name: namePattern });
    await expect(typeButton).toBeVisible();
    if ((await typeButton.getAttribute('aria-disabled')) === 'true') {
      test.skip(true, `${key} is disabled for this account`);
    }
    await typeButton.click();
    if (key === 'Retargeting' || key === 'Email Mapping') {
      await this.passPixlPlusCampaignUpsells();
    }
  }

  async fillNameStep(key: string, uniqueName: string): Promise<void> {
    const dlg = this.createDialog;
    await expect(dlg.getByRole('textbox', { name: 'Campaign name' })).toBeVisible();
    await this.selectProjectInCreateWizard();
    await this.page.getByRole('textbox', { name: 'Campaign name' }).fill(uniqueName);
    const next = dlg.getByRole('button', { name: 'Next', exact: true });
    const create = dlg.getByRole('button', { name: 'Create', exact: true });
    await expect(next.or(create)).toBeEnabled();
  }

  /**
   * Clicks through remaining wizard steps (objective, multi-step modals) until editor or grid handoff.
   * Call {@link MarketingAllPage.expectCampaignCreatedOrInGrid} afterward to assert the outcome.
   */
  async advanceThroughRemainingWizardSteps(key: string, uniqueName: string): Promise<void> {
    const dlg = this.createDialog;
    const next = dlg.getByRole('button', { name: 'Next', exact: true });
    const create = dlg.getByRole('button', { name: 'Create', exact: true });
    if ((await create.count()) > 0 && (await create.isEnabled().catch(() => false))) await create.click();
    else if ((await next.count()) > 0 && (await next.isEnabled().catch(() => false))) await next.click();

    if (WIZARD_HAS_OBJECTIVE_STEP.has(key)) {
      await this.passObjectiveStepIfPresent();
      await this.advanceCreateCampaignMainLoop(uniqueName);
    }
    if (MULTI_STEP_FINISH_MODAL.has(key)) {
      await this.finishMultiStepCreateModal(uniqueName, 75_000);
    }
  }

  /** Retargeting and similar types open a Pixl Plus upsell before the name step. */
  private async passPixlPlusCampaignUpsells(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      const upsell = this.page.getByRole('dialog', { name: /Try Pixl Plus|Duplicate as Pixl Plus/i });
      if (!(await upsell.isVisible().catch(() => false))) return;
      const stayOnType = upsell.getByRole('button', { name: /^Continue with / }).first();
      await stayOnType.click();
      await expect(upsell).toBeHidden({ timeout: 45_000 }).catch(() => undefined);
    }
  }

  /** Pick a project in the step-2 react-select (menu is not always exposed as role=listbox). */
  private async selectProjectInCreateWizard(projectLabel?: string): Promise<void> {
    const label = projectLabel ?? getOptionalEnv('FEATHR_PROJECT_NAME') ?? DEFAULT_PROJECT_PICK;
    const dialog = this.createDialog;
    const projectField = dialog.getByRole('textbox', { name: 'Project' });
    await projectField.click({ force: true });
    await projectField.fill(label);
    const menuList = this.page.locator('[class*="MenuList"], [class*="menu-list"]').last();
    await expect(menuList).toBeVisible({ timeout: 15_000 });
    await menuList.getByText(label, { exact: true }).first().click();
  }

  private async onResourceConfigurePage(uniqueName: string | undefined): Promise<boolean> {
    if (CREATED_RESOURCE_URL.test(this.page.url())) return true;
    if (!uniqueName) return false;
    const heading = this.page.getByRole('heading', { level: 1, name: uniqueName });
    return heading.isVisible({ timeout: 0 }).catch(() => false);
  }

  private async finishMultiStepCreateModal(uniqueName: string, maxMs = 120_000): Promise<void> {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      if (await this.onResourceConfigurePage(uniqueName)) return;

      const dlg = this.createDialog;
      if (!(await dlg.isVisible().catch(() => false))) {
        if (CREATED_RESOURCE_URL.test(this.page.url())) return;
        await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
        continue;
      }

      const createBtn = dlg.getByRole('button', { name: 'Create', exact: true });
      const nextBtn = dlg.getByRole('button', { name: 'Next', exact: true });
      const ce = await createBtn.isEnabled().catch(() => false);
      const ne = await nextBtn.isEnabled().catch(() => false);
      if (ce) await createBtn.click({ force: true, timeout: 5_000 }).catch(() => undefined);
      else if (ne) await nextBtn.click({ force: true, timeout: 5_000 }).catch(() => undefined);
      else {
        const radio = dlg.locator('[role="radio"]:not([aria-disabled="true"])').first();
        if (await radio.isVisible().catch(() => false)) await radio.click({ force: true });
        else await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
      }
      await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
    }
  }

  /** “Select an objective” step for display/RTB campaign types. */
  private async passObjectiveStepIfPresent(): Promise<void> {
    const objectiveDlg = this.page.getByRole('dialog', { name: 'Select an objective' });
    if (!(await objectiveDlg.isVisible().catch(() => false))) return;

    const objectivePatterns = [
      /Build Reach and Awareness/i,
      /Deepen Engagement/i,
      /Drive Conversions/i,
      /Custom Objective/i,
    ] as const;
    let picked = false;
    for (const pattern of objectivePatterns) {
      const radio = objectiveDlg.getByRole('radio', { name: pattern });
      if ((await radio.count()) === 0) continue;
      if (await radio.isEnabled().catch(() => false)) {
        await radio.click({ force: true });
        picked = true;
        break;
      }
    }
    if (!picked) {
      const fallback = objectiveDlg.locator('[role="radio"]:not([disabled])').first();
      await fallback.click({ force: true });
    }
    await expect(objectiveDlg.getByRole('button', { name: 'Create', exact: true })).toBeEnabled({
      timeout: 15_000,
    });
    await objectiveDlg.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(objectiveDlg).toBeHidden({ timeout: 60_000 });
  }

  /** Advance remaining “Create a campaign” modal steps (ads / landing / Single Send). Prefer Next when both buttons are enabled. */
  private async advanceCreateCampaignMainLoop(
    uniqueName: string | undefined,
    maxIterations = 40,
  ): Promise<void> {
    const createDlg = this.createDialog;
    for (let i = 0; i < maxIterations; i++) {
      if (await this.onResourceConfigurePage(uniqueName)) return;
      if (!(await createDlg.isVisible().catch(() => false))) break;

      const next = createDlg.getByRole('button', { name: 'Next', exact: true });
      const createBtn = createDlg.getByRole('button', { name: 'Create', exact: true });
      const nextEnabled = await next.isEnabled().catch(() => false);
      const createEnabled = await createBtn.isEnabled().catch(() => false);

      if (nextEnabled && createEnabled) {
        await next.click({ force: true });
        await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
        continue;
      }
      if (createEnabled) {
        try {
          await createBtn.click({ force: true, timeout: 8_000 });
        } catch {
          continue;
        }
        await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
        continue;
      }
      if (nextEnabled) {
        await next.click({ force: true });
        await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
        continue;
      }

      const radio = createDlg.locator('[role="radio"]:not([aria-disabled="true"])').first();
      if (await radio.isVisible().catch(() => false)) {
        await radio.click({ force: true });
        continue;
      }

      const checkbox = createDlg.getByRole('checkbox').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.check();
        continue;
      }
      break;
    }
  }
}
