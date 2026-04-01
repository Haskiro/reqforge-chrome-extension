import { expect, test } from '@playwright/test';

import { ChooseAuthPage } from '../pages/choose-auth-page';

test.describe('Вход гостем', () => {
  test('на странице входа отображается кнопка пропуска', async ({ page }) => {
    const auth = new ChooseAuthPage(page);
    await auth.goto();
    await expect(auth.skipButton).toBeVisible();
  });

  test('нажатие «Пропустить» открывает страницу правил', async ({ page }) => {
    const auth = new ChooseAuthPage(page);
    await auth.goto();
    await auth.skip();
    await expect(page.getByTestId('nav-rules')).toBeVisible();
    await expect(page.getByTestId('rule-form-title')).toBeVisible();
  });
});
