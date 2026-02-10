import { Page, Locator } from '@playwright/test';

/**
 * Provides navigation bar interactions.
 * Apply to any page that includes a navigation component.
 */
export class NavigationMixin {
  protected page!: Page;

  // Locators

  get nav_homeLink(): Locator {
    return this.page.getByRole('link', { name: /home/i });
  }

  get nav_profileLink(): Locator {
    return this.page.getByRole('link', { name: /profile|account/i });
  }

  get nav_settingsLink(): Locator {
    return this.page.getByRole('link', { name: /settings/i });
  }

  get nav_logoutButton(): Locator {
    return this.page.getByRole('button', { name: /log out|sign out/i });
  }

  get nav_userMenu(): Locator {
    return this.page.getByRole('button', { name: /user menu|account menu/i });
  }

  // Actions

  async nav_clickHome(): Promise<void> {
    await this.nav_homeLink.click();
  }

  async nav_clickProfile(): Promise<void> {
    await this.nav_profileLink.click();
  }

  async nav_clickSettings(): Promise<void> {
    await this.nav_settingsLink.click();
  }

  async nav_logout(): Promise<void> {
    await this.nav_logoutButton.click();
  }

  async nav_openUserMenu(): Promise<void> {
    await this.nav_userMenu.click();
  }

  // Assertions

  async nav_isHomeVisible(): Promise<boolean> {
    return await this.nav_homeLink.isVisible();
  }

  async nav_isProfileVisible(): Promise<boolean> {
    return await this.nav_profileLink.isVisible();
  }

  async nav_verifyLinksVisible(): Promise<boolean> {
    const home = await this.nav_homeLink.isVisible();
    const profile = await this.nav_profileLink.isVisible();
    const settings = await this.nav_settingsLink.isVisible();
    return home && profile && settings;
  }
}
