import { expect, test } from '@playwright/test';

import { RulesPage } from '../pages/rules-page';

test.describe('Управление группами', () => {
  let rulesPage: RulesPage;

  test.beforeEach(async ({ page }) => {
    rulesPage = new RulesPage(page);
    await rulesPage.goto();
  });

  test('новая группа создаётся при сохранении правила с указанным именем группы', async ({
    page,
  }) => {
    const { ruleForm, rulesList } = rulesPage;

    await ruleForm.fillGroupName('МояГруппа');
    await ruleForm.fillName('Правило в группе');
    await ruleForm.selectMethods(['GET']);
    await ruleForm.selectRuleType('Содержит');
    await ruleForm.fillValue('example.com');
    await ruleForm.selectDirection('Любое');
    await ruleForm.save();

    await expect(
      page.locator('[data-testid^="group-name-"]').filter({ hasText: 'МояГруппа' }),
    ).toBeVisible();

    await rulesList.expandGroup('МояГруппа');

    await expect(
      page.locator('[data-testid^="rule-name-"]').filter({ hasText: 'Правило в группе' }),
    ).toBeVisible();
  });

  test('переименование группы', async ({ page }) => {
    const { ruleForm, rulesList } = rulesPage;

    await ruleForm.fillGroupName('СтараяГруппа');
    await ruleForm.fillName('Правило в группе');
    await ruleForm.selectMethods(['GET']);
    await ruleForm.selectRuleType('Содержит');
    await ruleForm.fillValue('example.com');
    await ruleForm.selectDirection('Любое');
    await ruleForm.save();

    await rulesList.renameGroup('СтараяГруппа', 'НоваяГруппа');

    await expect(
      page.locator('[data-testid^="group-name-"]').filter({ hasText: 'НоваяГруппа' }),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid^="group-name-"]').filter({ hasText: 'СтараяГруппа' }),
    ).not.toBeVisible();
  });

  test('удаление группы после удаления всех её правил', async ({ page }) => {
    const { ruleForm, rulesList } = rulesPage;

    await ruleForm.fillGroupName('УдаляемаяГруппа');
    await ruleForm.fillName('Единственное правило');
    await ruleForm.selectMethods(['GET']);
    await ruleForm.selectRuleType('Содержит');
    await ruleForm.fillValue('example.com');
    await ruleForm.selectDirection('Любое');
    await ruleForm.save();

    await rulesList.expandGroup('УдаляемаяГруппа');
    await rulesList.deleteRule('Единственное правило');

    await rulesList.deleteGroup('УдаляемаяГруппа');

    await expect(
      page.locator('[data-testid^="group-name-"]').filter({ hasText: 'УдаляемаяГруппа' }),
    ).not.toBeVisible();
  });
});
