import { expect, test } from '@playwright/test';

import { injectChromeMock, makeTrafficEntry } from '../helpers/chrome-setup';
import { RepeatPage } from '../pages/repeat-page';
import { TrafficPage } from '../pages/traffic-page';

test.describe('Страница Повтор', () => {
  test('при прямом переходе отображается пустое состояние', async ({ page }) => {
    await injectChromeMock(page);
    await page.goto('/popup.html');
    const repeatPage = new RepeatPage(page);
    await repeatPage.goto();

    await expect(repeatPage.emptyState).toBeVisible();
    await expect(
      page.getByText('Выберите запросы во вкладке «Трафик» и нажмите «Повторить»'),
    ).toBeVisible();
  });

  test('вкладка появляется после добавления записи через Трафик', async ({ page }) => {
    const entry = makeTrafficEntry({ url: 'https://example.com/api/payload', status: 'complete' });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');

    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();
    await trafficPage.openRowMenu('https://example.com/api/payload');
    await trafficPage.clickRowAction('Повторить');

    const repeatPage = new RepeatPage(page);
    await expect(repeatPage.tabs).toBeVisible();
    await expect(repeatPage.tabs.locator('.ant-tabs-tab').first()).toBeVisible();
  });

  test('кнопка «Отправить» отображается при открытой вкладке записи', async ({ page }) => {
    const entry = makeTrafficEntry({
      url: 'https://example.com/api/send-test',
      status: 'complete',
    });
    await injectChromeMock(page, { entries: [entry] });
    await page.goto('/popup.html');

    const trafficPage = new TrafficPage(page);
    await trafficPage.goto();
    await trafficPage.openRowMenu('https://example.com/api/send-test');
    await trafficPage.clickRowAction('Повторить');

    const repeatPage = new RepeatPage(page);
    await expect(repeatPage.sendBtn).toBeVisible();
  });
});
