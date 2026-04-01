import { expect, test } from '@playwright/test';

import { injectChromeMock, makeTrafficEntry } from '../helpers/chrome-setup';
import { TrafficPage } from '../pages/traffic-page';

test.describe('Страница Трафик', () => {
  test('пустая таблица при отсутствии перехваченных запросов', async ({ page }) => {
    await injectChromeMock(page);
    await page.goto('/popup.html');
    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();

    await expect(page.getByText('Нет перехваченных запросов')).toBeVisible();
  });

  test('кнопки панели инструментов отключены без выбора строк', async ({ page }) => {
    await injectChromeMock(page);
    await page.goto('/popup.html');
    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();

    await expect(trafficPage.proceedBtn).toBeDisabled();
    await expect(trafficPage.rejectBtn).toBeDisabled();
  });

  test('предзаполненные записи отображаются в таблице', async ({ page }) => {
    const entry = makeTrafficEntry({ url: 'https://example.com/api/users' });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');
    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();

    await expect(trafficPage.getRow('https://example.com/api/users')).toBeVisible();
  });

  test('поиск фильтрует записи по URL', async ({ page }) => {
    const entry1 = makeTrafficEntry({ url: 'https://example.com/api/users' });
    const entry2 = makeTrafficEntry({ url: 'https://other.com/api/products' });
    await injectChromeMock(page, { entries: [entry1, entry2] });
    await page.goto('/popup.html');
    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();

    await trafficPage.searchInput.fill('users');
    await trafficPage.searchInput.press('Enter');

    await expect(trafficPage.getRow('https://example.com/api/users')).toBeVisible();
    await expect(trafficPage.getRow('https://other.com/api/products')).not.toBeVisible();
  });

  test('выбор строки активирует кнопки панели инструментов', async ({ page }) => {
    const entry = makeTrafficEntry({ url: 'https://example.com/api/data' });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');
    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();

    await trafficPage.selectRow('https://example.com/api/data');

    await expect(trafficPage.proceedBtn).toBeEnabled();
    await expect(trafficPage.rejectBtn).toBeEnabled();
  });

  test('контекстное меню строки содержит все действия', async ({ page }) => {
    const entry = makeTrafficEntry({ url: 'https://example.com/api/items', status: 'pending' });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');
    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();

    await trafficPage.openRowMenu('https://example.com/api/items');

    await expect(
      page.locator('.ant-dropdown-menu-item').filter({ hasText: 'Пропустить' }),
    ).toBeVisible();
    await expect(
      page.locator('.ant-dropdown-menu-item').filter({ hasText: 'Отклонить' }),
    ).toBeVisible();
    await expect(
      page.locator('.ant-dropdown-menu-item').filter({ hasText: 'Модифицировать' }),
    ).toBeVisible();
    await expect(
      page.locator('.ant-dropdown-menu-item').filter({ hasText: 'Повторить' }),
    ).toBeVisible();
  });

  test('«Повторить» переходит на страницу Повтор', async ({ page }) => {
    const entry = makeTrafficEntry({
      url: 'https://example.com/api/repeat-me',
      status: 'complete',
    });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');
    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();

    await trafficPage.openRowMenu('https://example.com/api/repeat-me');
    await trafficPage.clickRowAction('Повторить');

    await expect(page.getByTestId('nav-repeat')).toHaveClass(/navItemActive/);
  });
});
