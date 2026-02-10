import * as allure from 'allure-js-commons';

interface TestMetadata {
  displayName?: string;
  description?: string;
  tags?: string[];
  severity?: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
  epic?: string;
  feature?: string;
  story?: string;
  owner?: string;
}

/**
 * Allure reporting utilities for test metadata and attachments.
 */
export class AllureHelper {
  /**
   * Applies test metadata to the current Allure report.
   */
  static async applyTestMetadata(metadata: TestMetadata): Promise<void> {
    if (metadata.displayName) {
      await allure.displayName(metadata.displayName);
    }

    if (metadata.description) {
      await allure.description(metadata.description);
    }

    if (metadata.tags) {
      for (const tag of metadata.tags) {
        await allure.tag(tag);
      }
    }

    if (metadata.severity) {
      await allure.severity(metadata.severity);
    }

    if (metadata.epic) {
      await allure.epic(metadata.epic);
    }

    if (metadata.feature) {
      await allure.feature(metadata.feature);
    }

    if (metadata.story) {
      await allure.story(metadata.story);
    }

    if (metadata.owner) {
      await allure.owner(metadata.owner);
    }
  }

  /**
   * Attaches a screenshot to the Allure report.
   */
  static async attachScreenshot(
    name: string,
    buffer: Buffer
  ): Promise<void> {
    await allure.attachment(name, buffer, { contentType: 'image/png' });
  }

  /**
   * Attaches text content to the Allure report.
   */
  static async attachText(name: string, content: string): Promise<void> {
    await allure.attachment(name, content, { contentType: 'text/plain' });
  }

  /**
   * Attaches JSON data to the Allure report.
   */
  static async attachJson(name: string, data: object): Promise<void> {
    await allure.attachment(name, JSON.stringify(data, null, 2), {
      contentType: 'application/json',
    });
  }

  /**
   * Creates a step in the Allure report.
   */
  static async step<T>(
    name: string,
    action: () => Promise<T>
  ): Promise<T> {
    return await allure.step(name, action);
  }

  /**
   * Adds a link to the Allure report.
   */
  static async addLink(
    url: string,
    name?: string,
    type?: string
  ): Promise<void> {
    await allure.link(url, name, type);
  }

  /**
   * Adds an issue link to the Allure report.
   */
  static async addIssue(id: string): Promise<void> {
    await allure.issue(id, `Issue ${id}`);
  }

  /**
   * Adds a test case link to the Allure report.
   */
  static async addTestCase(id: string): Promise<void> {
    await allure.tms(id, `Test Case ${id}`);
  }
}
