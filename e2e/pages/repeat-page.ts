import type { Locator, Page } from '@playwright/test';

export class RepeatPage {
  readonly emptyState: Locator;
  readonly tabs: Locator;
  readonly sendBtn: Locator;

  constructor(private readonly page: Page) {
    this.emptyState = page.getByTestId('repeat-empty');
    this.tabs = page.getByTestId('repeat-tabs');
    this.sendBtn = page.getByTestId('repeat-send-btn');
  }

  async goto() {
    await this.page.getByTestId('nav-repeat').click();
  }

  getTab(name: string): Locator {
    return this.tabs.locator('.ant-tabs-tab').filter({ hasText: name });
  }
}
