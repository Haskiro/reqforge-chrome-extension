const storage: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    local: {
      get: (keys: string | string[] | null, cb: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        const keyList = keys === null ? Object.keys(storage) : Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) result[k] = storage[k];
        cb(result);
      },
      set: (items: Record<string, unknown>, cb?: () => void) => {
        Object.assign(storage, items);
        cb?.();
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
  },
};

if (typeof chrome === 'undefined') {
  (globalThis as unknown as { chrome: typeof chromeMock }).chrome = chromeMock;
}
