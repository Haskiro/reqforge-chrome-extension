import type { Page } from '@playwright/test';

export type MockStoredEntry = {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  status: 'pending' | 'sent' | 'response_pending' | 'complete';
  tabId?: number;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
};

export const injectChromeMock = async (page: Page, extraStorage: Record<string, unknown> = {}) => {
  await page.addInitScript(
    (storage: Record<string, unknown>) => {
      (globalThis as unknown as { chrome: unknown }).chrome = {
        storage: {
          local: {
            get: (keys: string | string[] | null) => {
              const result: Record<string, unknown> = {};
              const keyList =
                keys === null ? Object.keys(storage) : Array.isArray(keys) ? keys : [keys];
              for (const k of keyList) result[k] = storage[k];
              return Promise.resolve(result);
            },
            set: (items: Record<string, unknown>) => {
              Object.assign(storage, items);
              return Promise.resolve();
            },
            remove: (keys: string | string[]) => {
              const keyList = Array.isArray(keys) ? keys : [keys];
              for (const k of keyList) delete storage[k];
              return Promise.resolve();
            },
          },
          onChanged: { addListener: () => {}, removeListener: () => {} },
        },
        runtime: {
          sendMessage: (_msg: unknown, cb?: (r: unknown) => void) => {
            cb?.({ ok: true, status: 200, headers: {}, body: '' });
            return Promise.resolve();
          },
          onMessage: { addListener: () => {} },
          connect: () => ({
            postMessage: () => {},
            onDisconnect: { addListener: () => {} },
            disconnect: () => {},
          }),
        },
        debugger: {
          attach: () => {},
          detach: () => {},
          sendCommand: () => {},
          onEvent: { addListener: () => {}, removeListener: () => {} },
        },
      };
    },
    { authMode: 'guest', ...extraStorage },
  );
};

export const makeTrafficEntry = (overrides: Partial<MockStoredEntry> = {}): MockStoredEntry => ({
  id: `entry-${Math.random().toString(36).slice(2, 9)}`,
  timestamp: Date.now(),
  method: 'GET',
  url: 'https://example.com/api/test',
  requestHeaders: { 'content-type': 'application/json' },
  status: 'complete',
  responseStatus: 200,
  responseHeaders: {},
  ...overrides,
});
