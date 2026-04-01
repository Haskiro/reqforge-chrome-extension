import type { Locator, Page } from '@playwright/test';

export class RuleForm {
  readonly saveButton: Locator;
  readonly clearButton: Locator;
  readonly title: Locator;

  constructor(private readonly page: Page) {
    this.saveButton = page.getByTestId('rule-form-save');
    this.clearButton = page.getByTestId('rule-form-clear');
    this.title = page.getByTestId('rule-form-title');
  }

  async fillName(name: string) {
    await this.page.getByTestId('rule-form-name').fill(name);
  }

  async fillGroupName(name: string) {
    await this.page.getByTestId('rule-form-group').locator('input').fill(name);
  }

  async selectMethods(methods: string[]) {
    await this.page.getByTestId('rule-form-method').click();
    for (const method of methods) {
      await this.page.locator('.ant-select-dropdown').getByTitle(method).click();
    }
    await this.page.keyboard.press('Escape');
  }

  async selectRuleType(label: string) {
    await this.page.getByTestId('rule-form-type').click();
    await this.page.locator('.ant-select-dropdown').getByTitle(label).click();
  }

  async fillValue(value: string) {
    await this.page.getByTestId('rule-form-value').fill(value);
  }

  async selectDirection(label: string) {
    await this.page.getByTestId('rule-form-direction').click();
    await this.page.locator('.ant-select-dropdown').getByTitle(label).click();
  }

  async save() {
    await this.saveButton.click();
  }

  async clear() {
    await this.clearButton.click();
  }

  async openModificationsModal() {
    await this.page.getByTestId('rule-form-modifications-btn').click();
  }

  async addModification(headerName: string, value: string) {
    await this.page.getByRole('button', { name: 'Добавить модификацию' }).click();
    const rows = this.page
      .getByTestId('modifications-modal')
      .locator('.ant-flex')
      .filter({ has: this.page.getByPlaceholder('Имя заголовка') });
    const lastRow = rows.last();
    await lastRow.getByPlaceholder('Имя заголовка').fill(headerName);
    await lastRow.getByPlaceholder('Значение').fill(value);
  }

  async applyModifications() {
    await this.page.getByRole('button', { name: 'Применить' }).click();
  }
}
