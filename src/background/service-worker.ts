import type { Rule, StoredEntry } from '@/types';

import type { PopupToWorker } from '../shared/messages';
import { handleRequestPaused, handleResponsePaused } from './cdp-events';
import { enableFetch, shouldIntercept, tryAttachTab, tryDetachTab } from './cdp-manager';
import {
  handleApplyResponse,
  handleApplyResponseMany,
  handleProceed,
  handleProceedMany,
  handleReject,
  handleRejectMany,
  handleRepeat,
} from './message-handlers';
import {
  attachedTabs,
  cdpKeyToEntry,
  entryToCdp,
  networkToEntry,
  popupWindowId,
  setCachedRules,
  setPopupWindowId,
  setTargetTabId,
  targetTabId,
} from './state';
import { cleanupTabEntries, cleanupTabMaps, deleteEntry, saveCdpMaps } from './storage-queue';

chrome.action.onClicked.addListener(() => {
  void (async () => {
    if (popupWindowId != null) {
      try {
        await chrome.windows.update(popupWindowId, { focused: true });
        return;
      } catch {
        setPopupWindowId(undefined);
      }
    }
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 840,
      height: 710,
      focused: true,
    });
    setPopupWindowId(win?.id);
    await chrome.storage.session.set({ popupWindowId: win?.id });
    await chrome.storage.local.set({ entries: [] });

    if (targetTabId != null && !attachedTabs.has(targetTabId)) {
      await tryAttachTab(targetTabId);
    }
  })();
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    setPopupWindowId(undefined);
    void chrome.storage.session.set({ popupWindowId: null });
    void onPopupClosed();
  }
});

const onPopupClosed = async (): Promise<void> => {
  for (const tabId of [...attachedTabs]) {
    await tryDetachTab(tabId);
  }
  await chrome.storage.local.set({ entries: [] });
  const stored = await chrome.storage.local.get('rulesState');
  const rulesState = stored.rulesState as { rules: Rule[] } | null;
  if (rulesState?.rules?.length) {
    await chrome.storage.local.set({
      rulesState: { ...rulesState, rules: rulesState.rules.map((r) => ({ ...r, enabled: false })) },
    });
  }
  setCachedRules([]);
};

void (async () => {
  const local = await chrome.storage.local.get(['rulesState']);
  setCachedRules((local.rulesState as { rules: Rule[] } | null)?.rules ?? []);

  const session = await chrome.storage.session.get([
    'cdpMap',
    'entryMap',
    'targetTabId',
    'popupWindowId',
  ]);
  if (session.cdpMap) {
    for (const [k, v] of Object.entries(session.cdpMap as Record<string, string>)) {
      cdpKeyToEntry.set(k, v);
    }
  }
  if (session.entryMap) {
    for (const [k, v] of Object.entries(
      session.entryMap as Record<string, { tabId: number; cdpRequestId: string }>,
    )) {
      entryToCdp.set(k, v);
    }
  }
  if (session.targetTabId) {
    setTargetTabId(session.targetTabId as number);
  }

  if (session.popupWindowId) {
    try {
      await chrome.windows.get(session.popupWindowId as number);
      setPopupWindowId(session.popupWindowId as number);
      const targets = await chrome.debugger.getTargets();
      for (const t of targets) {
        if (t.tabId != null && t.attached) attachedTabs.add(t.tabId);
      }
      if (targetTabId != null && !attachedTabs.has(targetTabId)) {
        await tryAttachTab(targetTabId);
      }
    } catch {
      setPopupWindowId(undefined);
      await chrome.storage.session.set({ popupWindowId: null });
    }
  }

  if (targetTabId == null) {
    const [active] = await chrome.tabs.query({ active: true, windowType: 'normal' });
    const id = active?.id;
    if (id != null) {
      setTargetTabId(id);
      await chrome.storage.session.set({ targetTabId: id });
    }
  }
})();

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.storage.local.set({ entries: [] });
  } else {
    chrome.storage.local.get('entries', (r) => {
      const existing: StoredEntry[] = (r.entries as StoredEntry[]) ?? [];
      const cleaned = existing.filter(
        (e) => e.status !== 'pending' && e.status !== 'response_pending',
      );
      void chrome.storage.local.set({ entries: cleaned });
    });
  }
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void (async () => {
    try {
      const win = await chrome.windows.get(windowId);
      if (win.type !== 'normal') return;

      const prevTarget = targetTabId;
      setTargetTabId(tabId);
      await chrome.storage.session.set({ targetTabId: tabId });

      if (!shouldIntercept() || popupWindowId == null) return;

      if (prevTarget != null && prevTarget !== tabId && attachedTabs.has(prevTarget)) {
        const result = await chrome.storage.local.get('entries');
        const entries: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
        const hasPending = entries.some(
          (e) =>
            e.tabId === prevTarget && (e.status === 'pending' || e.status === 'response_pending'),
        );
        if (!hasPending) {
          await tryDetachTab(prevTarget);
        }
      }
      if (!attachedTabs.has(tabId)) {
        await tryAttachTab(tabId);
      }
    } catch (e) {
      console.warn('[RF:sw] onActivated error:', e);
    }
  })();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.rulesState) {
    setCachedRules((changes.rulesState.newValue as { rules: Rule[] } | null)?.rules ?? []);
    if (popupWindowId != null) {
      void (async () => {
        if (shouldIntercept()) {
          if (targetTabId != null && !attachedTabs.has(targetTabId)) {
            await tryAttachTab(targetTabId);
          } else {
            for (const tabId of attachedTabs) {
              try {
                await enableFetch(tabId);
              } catch (e) {
                console.warn(`[RF:sw] enableFetch (rules update) failed for tab ${tabId}:`, e);
              }
            }
          }
        }
      })();
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;
  if (tabId !== targetTabId) return;
  void cleanupTabEntries(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === targetTabId) setTargetTabId(undefined);
  attachedTabs.delete(tabId);
  void cleanupTabMaps(tabId);
});

chrome.debugger.onDetach.addListener((source, reason) => {
  const tabId = source.tabId;
  if (tabId == null) return;
  attachedTabs.delete(tabId);

  if (reason === 'canceled_by_user') {
    void cleanupTabMaps(tabId);
    void chrome.runtime.sendMessage({ type: 'DEBUGGER_DETACHED' });
    return;
  }

  void (async () => {
    await cleanupTabMaps(tabId);
    if (tabId !== targetTabId || popupWindowId == null) return;
    try {
      await chrome.tabs.get(tabId);
      await tryAttachTab(tabId);
    } catch {
      // tab is gone, nothing to do
    }
  })();
});

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  if (tabId == null) return;

  if (method === 'Network.loadingFailed') {
    const p = params as { requestId: string; canceled?: boolean };
    if (!p.canceled) return;
    void (async () => {
      const eid = networkToEntry.get(p.requestId);
      if (!eid) return;
      networkToEntry.delete(p.requestId);
      const cdpInfo = entryToCdp.get(eid);
      if (cdpInfo) {
        cdpKeyToEntry.delete(`${cdpInfo.tabId}:${cdpInfo.cdpRequestId}`);
        entryToCdp.delete(eid);
      }
      await deleteEntry(eid);
      await saveCdpMaps();
    })();
    return;
  }

  if (method !== 'Fetch.requestPaused') return;

  const p = params as {
    requestId: string;
    networkId?: string;
    request: {
      url: string;
      method: string;
      headers: Record<string, string>;
      postData?: string;
    };
    responseStatusCode?: number;
    responseHeaders?: Array<{ name: string; value: string }>;
  };

  if (p.responseStatusCode !== undefined) {
    void handleResponsePaused(
      tabId,
      p.requestId,
      p.request.url,
      p.request.method,
      p.responseStatusCode,
      p.responseHeaders ?? [],
    );
  } else {
    void handleRequestPaused(tabId, p.requestId, p.networkId ?? null, p.request);
  }
});

chrome.runtime.onMessage.addListener((msg: PopupToWorker, _sender, sendResponse) => {
  void (async () => {
    if (msg.type === 'PROCEED') {
      await handleProceed(msg);
    } else if (msg.type === 'PROCEED_MANY') {
      await handleProceedMany(msg);
    } else if (msg.type === 'APPLY_RESPONSE') {
      await handleApplyResponse(msg);
    } else if (msg.type === 'REJECT') {
      await handleReject(msg);
    } else if (msg.type === 'REJECT_MANY') {
      await handleRejectMany(msg);
    } else if (msg.type === 'APPLY_RESPONSE_MANY') {
      await handleApplyResponseMany(msg);
    } else if (msg.type === 'REPEAT') {
      await handleRepeat(msg, sendResponse);
      return;
    } else if (msg.type === 'REATTACH_DEBUGGER') {
      if (targetTabId != null) await tryAttachTab(targetTabId);
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: true });
  })();
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'keepalive') return;
  port.onMessage.addListener(() => {});
});
