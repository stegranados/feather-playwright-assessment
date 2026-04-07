const DEFAULT_BASE_URL = 'https://login-staging.feathr.co/';
const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const DEFAULT_TEST_ID_ATTRIBUTE = 'data-testid';
const DEFAULT_LOG_LEVEL = 'info';

export interface RuntimeEnv {
  baseUrl: string;
  timezone: string;
  testIdAttribute: string;
  logLevel: string;
}

export interface AuthEnv {
  testUserEmail: string;
  testUserPassword: string;
  otpUsername: string;
}

export interface MailinatorEnv {
  apiToken: string;
  domain: string;
  debug: boolean;
  pollIntervalMs?: number;
  pollStartDelayMs?: number;
}

export interface MidsceneEnv {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  modelFamily: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Optional string env (e.g. wizard project label). */
export function getOptionalEnv(name: string): string | undefined {
  return readEnv(name);
}

export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalBooleanEnv(name: string): boolean | undefined {
  const value = readEnv(name);
  if (!value) {
    return undefined;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function getOptionalPositiveIntEnv(name: string): number | undefined {
  const value = readEnv(name);
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function getOptionalNonNegativeIntEnv(name: string): number | undefined {
  const value = readEnv(name);
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

let cachedRuntimeEnv: RuntimeEnv | undefined;
let cachedAuthEnv: AuthEnv | undefined;
let cachedMailinatorEnv: MailinatorEnv | undefined;
let cachedMidsceneEnv: MidsceneEnv | undefined;

export function getRuntimeEnv(): RuntimeEnv {
  if (cachedRuntimeEnv) {
    return cachedRuntimeEnv;
  }

  cachedRuntimeEnv = {
    baseUrl: readEnv('BASE_URL') ?? DEFAULT_BASE_URL,
    timezone: readEnv('TIMEZONE') ?? DEFAULT_TIMEZONE,
    testIdAttribute: readEnv('TEST_ID_ATTRIBUTE') ?? DEFAULT_TEST_ID_ATTRIBUTE,
    logLevel: readEnv('LOG_LEVEL') ?? DEFAULT_LOG_LEVEL,
  };

  return cachedRuntimeEnv;
}

export function getAuthEnv(): AuthEnv {
  if (cachedAuthEnv) {
    return cachedAuthEnv;
  }

  cachedAuthEnv = {
    testUserEmail: requireEnv('TEST_USER_EMAIL'),
    testUserPassword: requireEnv('TEST_USER_PASSWORD'),
    otpUsername: requireEnv('OTP_USERNAME'),
  };

  return cachedAuthEnv;
}

export function getMailinatorEnv(): MailinatorEnv {
  if (cachedMailinatorEnv) {
    return cachedMailinatorEnv;
  }

  cachedMailinatorEnv = {
    apiToken: requireEnv('MAILINATOR_API_TOKEN'),
    domain: requireEnv('MAILINATOR_DOMAIN'),
    debug: getOptionalBooleanEnv('MAILINATOR_DEBUG') ?? false,
    pollIntervalMs: getOptionalPositiveIntEnv('MAILINATOR_POLL_INTERVAL_MS'),
    pollStartDelayMs: getOptionalNonNegativeIntEnv('MAILINATOR_POLL_START_DELAY_MS'),
  };

  return cachedMailinatorEnv;
}

/**
 * Validates MidScene.js AI model configuration.
 * Only called by tests that opt into AI visual fixtures — existing tests are unaffected.
 */
export function getMidsceneEnv(): MidsceneEnv {
  if (cachedMidsceneEnv) {
    return cachedMidsceneEnv;
  }

  cachedMidsceneEnv = {
    baseUrl: requireEnv('MIDSCENE_MODEL_BASE_URL'),
    apiKey: requireEnv('MIDSCENE_MODEL_API_KEY'),
    modelName: requireEnv('MIDSCENE_MODEL_NAME'),
    modelFamily: requireEnv('MIDSCENE_MODEL_FAMILY'),
  };

  return cachedMidsceneEnv;
}
