/**
 * Central timeouts (ms) and tuning values for Playwright specs, Mailinator, and Feathr flows.
 * Import from `lib/constants/test-constants` (or add a path alias later).
 */
export const TestTimeouts = {
  /** MFA / OTP field visible after password sign-in */
  otpFieldVisible: 60_000,

  /** Authenticated shell (e.g. main nav) after OTP is accepted */
  dashboardShell: 10_000,

  /** Max wall time to poll Mailinator and parse Feathr OTP from email */
  mailinatorOtp: 120_000,

  /** `waitForURL` / URL assertions until path contains a fragment (e.g. `/dashboard`) */
  urlPathContains: 30_000,

  /** Marketing → All grid shell and initial load */
  marketingGridVisible: 25_000,

  /** Marketing dialogs such as Filters and Duplicate Campaign */
  marketingDialogVisible: 10_000,

  /** Marketing data-row visibility once filters/search have settled */
  marketingRowVisible: 30_000,

  /** Async duplicate job polling for clone rows to appear */
  marketingCloneJob: 150_000,

  /** Create-campaign-by-type suite (serial describe timeout) */
  marketingWizardSuite: 300_000,

  /** Poll until new campaign appears in Marketing grid or editor URL */
  marketingCampaignCreatedPoll: 120_000,
} as const;

/** Subtracted from `mailinatorClockSeconds()` when setting `messageMinUnixSeconds` (clock skew). */
export const MAILINATOR_OTP_BASELINE_SKEW_SECONDS = 15;
