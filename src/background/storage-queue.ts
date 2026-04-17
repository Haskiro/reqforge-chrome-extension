import type { StoredEntry } from '@/types';

import { cdpKeyToEntry, entryToCdp, networkToEntry } from './state';

let storageQueue = Promise.resolve();

const enqueueStorage = (task: () => Promise<void>): Promise<void> => {
  storageQueue = storageQueue.then(task);
  return storageQueue;
};

export const saveCdpMaps = async (): Promise<void> => {
  await chrome.storage.session.set({
    cdpMap: Object.fromEntries(cdpKeyToEntry),
    entryMap: Object.fromEntries(entryToCdp),
  });
};

export const upsertEntry = (entry: StoredEntry): Promise<void> =>
  enqueueStorage(async () => {
    const result = await chrome.storage.local.get('entries');
    const existing: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, 100);
    await chrome.storage.local.set({ entries: updated });
  });

export const deleteEntry = (id: string): Promise<void> => deleteEntries([id]);

export const deleteEntries = (ids: string[]): Promise<void> =>
  enqueueStorage(async () => {
    const idSet = new Set(ids);
    const result = await chrome.storage.local.get('entries');
    const existing: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
    await chrome.storage.local.set({ entries: existing.filter((e) => !idSet.has(e.id)) });
  });

export const cleanupTabMaps = async (tabId: number): Promise<void> => {
  for (const [key, entryId] of cdpKeyToEntry) {
    if (key.startsWith(`${tabId}:`)) {
      cdpKeyToEntry.delete(key);
      entryToCdp.delete(entryId);
    }
  }
  for (const [networkId, entryId] of networkToEntry) {
    const cdpInfo = entryToCdp.get(entryId);
    if (!cdpInfo || cdpInfo.tabId === tabId) networkToEntry.delete(networkId);
  }
  await saveCdpMaps();
};

export const cleanupTabEntries = async (tabId: number): Promise<void> => {
  const result = await chrome.storage.local.get('entries');
  const entries: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
  const cleaned = entries.filter(
    (e) => !(e.tabId === tabId && (e.status === 'pending' || e.status === 'response_pending')),
  );
  if (cleaned.length !== entries.length) {
    await chrome.storage.local.set({ entries: cleaned });
  }
  await cleanupTabMaps(tabId);
};
