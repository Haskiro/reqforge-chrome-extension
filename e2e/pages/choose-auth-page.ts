import type { Locator, Page } from '@playwright/test';

export class ChooseAuthPage {
  readonly skipButton: Locator;

  constructor(private readonly page: Page) {
    this.skipButton = page.getByTestId('skip-auth-button');
  }

  async goto() {
    await this.page.goto('/popup.html');
  }

  async skip() {
    await this.skipButton.click();
  }
}
