import { expect, test } from '@playwright/test';

import { injectChromeMock, makeTrafficEntry } from '../helpers/chrome-setup';
import { ModifyRequestPage } from '../pages/modify-request-page';
import { TrafficPage } from '../pages/traffic-page';

const openModifyPage = async (page: import('@playwright/test').Page, url: string) => {
  const trafficPage = new TrafficPage(page);
  await trafficPage.goto();
  await trafficPage.openRowMenu(url);
  await trafficPage.clickRowAction('Модифицировать');
  return new ModifyRequestPage(page);
};

test.describe('Страница модификации запроса', () => {
  test('открывается из меню строки трафика с корректными URL и методом', async ({ page }) => {
    const entry = makeTrafficEntry({
      url: 'https://example.com/api/resource',
      method: 'POST',
      status: 'pending',
    });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');

    const modifyPage = await openModifyPage(page, 'https://example.com/api/resource');

    await expect(modifyPage.urlInput).toBeVisible();
    await expect(modifyPage.methodSelect).toBeVisible();
    await expect(modifyPage.urlInput).toHaveValue('https://example.com/api/resource');
  });

  test('переключение на вкладку «Текст» показывает редактор сырого текста', async ({ page }) => {
    const entry = makeTrafficEntry({ url: 'https://example.com/api/raw', status: 'pending' });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');

    const modifyPage = await openModifyPage(page, 'https://example.com/api/raw');
    await modifyPage.switchToTextTab();

    await expect(page.locator('.cm-editor').last()).toBeVisible();
  });

  test('кнопка «Отменить» возвращает на страницу Трафик', async ({ page }) => {
    const entry = makeTrafficEntry({ url: 'https://example.com/api/cancel', status: 'pending' });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');

    const modifyPage = await openModifyPage(page, 'https://example.com/api/cancel');
    await modifyPage.cancelBtn.click();

    await expect(page.getByTestId('nav-traffic')).toHaveClass(/navItemActive/);
    await expect(page.getByTestId('traffic-table')).toBeVisible();
  });

  test('кнопка «Отправить» отправляет сообщение и возвращает на страницу Трафик', async ({
    page,
  }) => {
    const entry = makeTrafficEntry({ url: 'https://example.com/api/submit', status: 'pending' });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');

    const modifyPage = await openModifyPage(page, 'https://example.com/api/submit');
    await modifyPage.submitBtn.click();

    await expect(page.getByTestId('nav-traffic')).toHaveClass(/navItemActive/);
    await expect(page.getByTestId('traffic-table')).toBeVisible();
  });
});
