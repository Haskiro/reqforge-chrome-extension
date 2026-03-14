// Chrome Extension Background Service Worker
// Перехват трафика реализуется в Фазе 1 (шаг 1.6)

chrome.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line no-console
  console.log('ReqForge service worker installed');
});
