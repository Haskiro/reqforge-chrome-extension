const storage: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    local: {
      get: (keys: string | string[] | null): Promise<Record<string, unknown>> => {
        const result: Record<string, unknown> = {};
        const keyList = keys === null ? Object.keys(storage) : Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) result[k] = storage[k];
        return Promise.resolve(result);
      },
      set: (items: Record<string, unknown>): Promise<void> => {
        Object.assign(storage, items);
        return Promise.resolve();
      },
      remove: (keys: string | string[]): Promise<void> => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) delete storage[k];
        return Promise.resolve();
      },
    },
    onChanged: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  runtime: {
    sendMessage: () => Promise.resolve(),
    onMessage: { addListener: () => {} },
    connect: () => ({
      postMessage: () => {},
      onDisconnect: { addListener: () => {} },
      disconnect: () => {},
    }),
  },
};

if (typeof chrome === 'undefined' || !chrome.storage) {
  (globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;
}
