import { expect, test } from '@playwright/test';

import { RulesPage } from '../pages/rules-page';

test.describe('CRUD правил', () => {
  let rulesPage: RulesPage;

  test.beforeEach(async ({ page }) => {
    rulesPage = new RulesPage(page);
    await rulesPage.goto();
  });

  test('создание останавливающего правила', async () => {
    const { ruleForm, rulesList } = rulesPage;

    await ruleForm.fillName('Тестовое правило');
    await ruleForm.selectMethods(['GET']);
    await ruleForm.selectRuleType('Содержит');
    await ruleForm.fillValue('example.com');
    await ruleForm.selectDirection('Любое');
    await ruleForm.save();

    await expect(rulesList.getRule('Тестовое правило')).toBeVisible();
  });

  test('редактирование правила — название обновляется в списке', async ({ page }) => {
    const { ruleForm, rulesList } = rulesPage;

    await ruleForm.fillName('Правило для редактирования');
    await ruleForm.selectMethods(['GET']);
    await ruleForm.selectRuleType('Содержит');
    await ruleForm.fillValue('example.com');
    await ruleForm.selectDirection('Любое');
    await ruleForm.save();

    await rulesList.selectRule('Правило для редактирования');
    await page.waitForTimeout(300);
    await ruleForm.fillName('Переименованное правило');
    await ruleForm.save();

    await expect(rulesList.getRule('Переименованное правило')).toBeVisible();
    await expect(rulesList.getRule('Правило для редактирования')).not.toBeVisible();
  });

  test('переключение правила меняет состояние тумблера', async ({ page }) => {
    const { ruleForm } = rulesPage;

    await ruleForm.fillName('Тоггл правило');
    await ruleForm.selectMethods(['GET']);
    await ruleForm.selectRuleType('Содержит');
    await ruleForm.fillValue('example.com');
    await ruleForm.selectDirection('Любое');
    await ruleForm.save();

    const ruleName = page
      .locator('[data-testid^="rule-name-"]')
      .filter({ hasText: 'Тоггл правило' });
    const row = ruleName.locator('xpath=..');
    const switchEl = row.locator('[data-testid^="rule-toggle-"]');
    await expect(switchEl).toHaveClass(/ant-switch-checked/);
    await switchEl.click();
    await expect(switchEl).not.toHaveClass(/ant-switch-checked/);
  });

  test('удаление правила убирает его из списка', async () => {
    const { ruleForm, rulesList } = rulesPage;

    await ruleForm.fillName('Правило для удаления');
    await ruleForm.selectMethods(['GET']);
    await ruleForm.selectRuleType('Содержит');
    await ruleForm.fillValue('example.com');
    await ruleForm.selectDirection('Любое');
    await ruleForm.save();

    await expect(rulesList.getRule('Правило для удаления')).toBeVisible();

    await rulesList.deleteRule('Правило для удаления');

    await expect(rulesList.getRule('Правило для удаления')).not.toBeVisible();
  });

  test('создание фонового правила с модификацией', async () => {
    const { ruleForm, rulesList } = rulesPage;

    await rulesList.switchMode('background');
    await ruleForm.fillName('Фоновое правило');
    await ruleForm.selectMethods(['GET']);
    await ruleForm.selectRuleType('Содержит');
    await ruleForm.fillValue('api.example.com');
    await ruleForm.selectDirection('Запрос');
    await ruleForm.openModificationsModal();
    await ruleForm.addModification('X-Test-Header', 'test-value');
    await ruleForm.applyModifications();
    await ruleForm.save();

    await expect(rulesList.getRule('Фоновое правило')).toBeVisible();
  });
});
