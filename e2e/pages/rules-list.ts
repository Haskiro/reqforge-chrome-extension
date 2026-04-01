import type { Locator, Page } from '@playwright/test';

export class RulesList {
  constructor(private readonly page: Page) {}

  async switchMode(mode: 'interactive' | 'background') {
    const testId = mode === 'interactive' ? 'tab-interactive' : 'tab-background';
    await this.page.getByTestId(testId).click();
  }

  getRule(name: string): Locator {
    return this.page.locator(`[data-testid^="rule-name-"]`).filter({ hasText: name });
  }

  async toggleRule(name: string) {
    const ruleName = this.page.locator(`[data-testid^="rule-name-"]`).filter({ hasText: name });
    const row = ruleName.locator('xpath=..');
    const toggle = row.locator('[data-testid^="rule-toggle-"]');
    await toggle.click();
  }

  async selectRule(name: string) {
    await this.page.locator(`[data-testid^="rule-name-"]`).filter({ hasText: name }).click();
  }

  async deleteRule(name: string) {
    const ruleName = this.page.locator(`[data-testid^="rule-name-"]`).filter({ hasText: name });
    const row = ruleName.locator('xpath=..');
    await row.locator('[data-testid^="rule-delete-btn-"]').click();
  }

  async expandGroup(name: string) {
    const nameEl = this.page.locator('[data-testid^="group-name-"]').filter({ hasText: name });
    const testId = await nameEl.getAttribute('data-testid');
    const groupId = testId!.replace('group-name-', '');
    const collapseHeader = this.page
      .locator(`[data-testid="rules-groups-collapse"]`)
      .locator(`.ant-collapse-item`)
      .filter({ has: this.page.getByTestId(`group-name-${groupId}`) })
      .locator('.ant-collapse-header');
    const expanded = await collapseHeader.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await collapseHeader.click();
    }
  }

  async renameGroup(oldName: string, newName: string) {
    const nameEl = this.page.locator('[data-testid^="group-name-"]').filter({ hasText: oldName });
    const testId = await nameEl.getAttribute('data-testid');
    const groupId = testId!.replace('group-name-', '');
    await this.page.getByTestId(`group-edit-btn-${groupId}`).click();
    const dialog = this.page.getByTestId('edit-group-modal');
    await dialog.getByTestId('edit-group-input').clear();
    await dialog.getByTestId('edit-group-input').fill(newName);
    await dialog.getByRole('button', { name: 'Сохранить' }).click();
  }

  async deleteGroup(name: string) {
    const nameEl = this.page.locator('[data-testid^="group-name-"]').filter({ hasText: name });
    const testId = await nameEl.getAttribute('data-testid');
    const groupId = testId!.replace('group-name-', '');
    await this.page.getByTestId(`group-delete-btn-${groupId}`).click();
    await this.page.getByRole('button', { name: 'Удалить' }).click();
  }
}
