import type { Locator, Page } from '@playwright/test';

export class TrafficPage {
  readonly searchInput: Locator;
  readonly proceedBtn: Locator;
  readonly rejectBtn: Locator;
  readonly table: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByTestId('traffic-search').locator('input').first();
    this.proceedBtn = page.getByTestId('traffic-proceed-btn');
    this.rejectBtn = page.getByTestId('traffic-reject-btn');
    this.table = page.getByTestId('traffic-table');
  }

  async goto() {
    await this.page.getByTestId('nav-traffic').click();
    await this.table.waitFor({ state: 'visible' });
  }

  getRow(url: string): Locator {
    return this.table.locator('tr').filter({ hasText: url });
  }

  async openRowMenu(url: string) {
    const row = this.getRow(url);
    await row.getByTestId('traffic-row-menu-btn').click();
  }

  async clickRowAction(label: string) {
    await this.page.locator('.ant-dropdown-menu-item').filter({ hasText: label }).click();
  }

  async selectRow(url: string) {
    const row = this.getRow(url);
    await row.locator('input[type="checkbox"]').check();
  }
}
