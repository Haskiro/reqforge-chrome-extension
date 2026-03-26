import { useEffect } from 'react';

import type { StoredEntry } from '@/types';

export const useEntriesChange = (callback: (entries: StoredEntry[]) => void) => {
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes['entries']) return;
      callback((changes['entries'].newValue as StoredEntry[]) ?? []);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [callback]);
};
