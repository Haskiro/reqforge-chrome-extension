import type { Locator, Page } from '@playwright/test';

export class AppBar {
  readonly rulesLink: Locator;
  readonly trafficLink: Locator;
  readonly repeatLink: Locator;
  readonly helpLink: Locator;

  constructor(page: Page) {
    this.rulesLink = page.getByTestId('nav-rules');
    this.trafficLink = page.getByTestId('nav-traffic');
    this.repeatLink = page.getByTestId('nav-repeat');
    this.helpLink = page.getByTestId('nav-help');
  }

  async navigateTo(section: 'rules' | 'traffic' | 'repeat' | 'help') {
    const map = {
      rules: this.rulesLink,
      traffic: this.trafficLink,
      repeat: this.repeatLink,
      help: this.helpLink,
    };
    await map[section].click();
  }
}
