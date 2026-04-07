import { test as pageFixture, expect as baseExpect } from './page-fixtures';
import type { PlayWrightAiFixtureType } from '@midscene/web/playwright';
import { PlaywrightAiFixture } from '@midscene/web/playwright';
import { getMidsceneEnv } from '../env';

getMidsceneEnv();

export const test = pageFixture.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    waitForNetworkIdleTimeout: 3000,
  }),
);

export const expect = baseExpect;
