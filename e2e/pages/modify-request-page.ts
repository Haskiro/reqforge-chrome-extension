import type { Locator, Page } from '@playwright/test';

export class ModifyRequestPage {
  readonly backBtn: Locator;
  readonly cancelBtn: Locator;
  readonly submitBtn: Locator;
  readonly urlInput: Locator;
  readonly methodSelect: Locator;
  readonly statusInput: Locator;

  constructor(private readonly page: Page) {
    this.backBtn = page.getByTestId('modify-back-btn');
    this.cancelBtn = page.getByTestId('modify-cancel-btn');
    this.submitBtn = page.getByTestId('modify-submit-btn');
    this.urlInput = page.getByTestId('modify-url-input');
    this.methodSelect = page.getByTestId('modify-method-select');
    this.statusInput = page.getByTestId('modify-status-input');
  }

  async switchToTextTab() {
    await this.page.getByTestId('modify-tab-text').click();
  }

  async switchToFormTab() {
    await this.page.getByTestId('modify-tab-form').click();
  }
}
