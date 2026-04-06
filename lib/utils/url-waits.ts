import { expect, Page } from '@playwright/test';
import { TestTimeouts } from '../constants';

export type UrlPathWaitOptions = {
  timeout?: number;
};

function pathPredicate(pathFragment: string): (url: { pathname: string }) => boolean {
  return (url) => url.pathname.includes(pathFragment);
}

/**
 * Waits until `window.location`’s **pathname** includes the fragment (e.g. `"/dashboard"` or `"dashboard"`).
 * Use for post-navigation sync; does not assert by itself.
 */
export async function waitForUrlPathContains(
  page: Page,
  pathFragment: string,
  options?: UrlPathWaitOptions
): Promise<void> {
  await page.waitForURL(pathPredicate(pathFragment), {
    timeout: options?.timeout ?? TestTimeouts.urlPathContains,
  });
}

/**
 * Asserts the page URL path contains the fragment (wraps `expect(page).toHaveURL` with the same predicate).
 */
export async function expectUrlPathContains(
  page: Page,
  pathFragment: string,
  options?: UrlPathWaitOptions
): Promise<void> {
  await expect(page).toHaveURL(pathPredicate(pathFragment), {
    timeout: options?.timeout ?? TestTimeouts.urlPathContains,
  });
}
