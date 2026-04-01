import { expect, test } from '@playwright/test';

import { RulesPage } from '../pages/rules-page';

test.describe('Навигация', () => {
  let rulesPage: RulesPage;

  test.beforeEach(async ({ page }) => {
    rulesPage = new RulesPage(page);
    await rulesPage.goto();
  });

  test('переход на страницу Трафик', async ({ page }) => {
    await rulesPage.appBar.navigateTo('traffic');
    await expect(page.getByTestId('nav-traffic')).toHaveClass(/navItemActive/);
  });

  test('переход на страницу Повтор', async ({ page }) => {
    await rulesPage.appBar.navigateTo('repeat');
    await expect(page.getByTestId('nav-repeat')).toHaveClass(/navItemActive/);
  });

  test('переход на страницу Помощь', async ({ page }) => {
    await rulesPage.appBar.navigateTo('help');
    await expect(page.getByTestId('nav-help')).toHaveClass(/navItemActive/);
  });

  test('возврат на страницу Правила', async ({ page }) => {
    await rulesPage.appBar.navigateTo('traffic');
    await rulesPage.appBar.navigateTo('rules');
    await expect(page.getByTestId('rule-form-title')).toBeVisible();
  });

  test('активный пункт навигации получает активный класс', async ({ page }) => {
    await expect(page.getByTestId('nav-rules')).toHaveClass(/navItemActive/);

    await rulesPage.appBar.navigateTo('traffic');
    await expect(page.getByTestId('nav-traffic')).toHaveClass(/navItemActive/);
  });
});
