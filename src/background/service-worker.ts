import type { StoredEntry } from '@/types';

import type { PopupToWorker } from '../shared/messages';

// ── Window management ─────────────────────────────────────────────────────────

let popupWindowId: number | undefined;

chrome.action.onClicked.addListener(() => {
  void (async () => {
    if (popupWindowId != null) {
      try {
        await chrome.windows.update(popupWindowId, { focused: true });
        return;
      } catch {
        popupWindowId = undefined;
      }
    }
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 840,
      height: 650,
      focused: true,
    });
    popupWindowId = win?.id;
    await chrome.storage.session.set({ popupWindowId: win?.id });

    // Start intercepting when popup opens (if filter is already set)
    if (filterUrl && targetTabId != null && !attachedTabs.has(targetTabId)) {
      await tryAttachTab(targetTabId);
    }
  })();
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = undefined;
    void chrome.storage.session.set({ popupWindowId: null });
    void onPopupClosed();
  }
});

async function onPopupClosed(): Promise<void> {
  // Detach from all tabs — Chrome will auto-resume any paused requests
  for (const tabId of [...attachedTabs]) {
    await tryDetachTab(tabId);
  }
  // Clear intercepted history
  await chrome.storage.local.set({ entries: [] });
  console.log('[RF:sw] popup closed — detached all, cleared history');
}

// ── CDP state ─────────────────────────────────────────────────────────────────
// Maps are persisted to chrome.storage.session so they survive SW restarts.

const attachedTabs = new Set<number>();
// `${tabId}:${cdpRequestId}` → entryId
const cdpKeyToEntry = new Map<string, string>();
// entryId → { tabId, cdpRequestId }
const entryToCdp = new Map<string, { tabId: number; cdpRequestId: string }>();

let filterUrl = '';
// The single tab we're currently intercepting
let targetTabId: number | undefined;

// ── Startup: restore state from storage ──────────────────────────────────────

void (async () => {
  const local = await chrome.storage.local.get('filterUrl');
  filterUrl = (local.filterUrl as string) || '';

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
    targetTabId = session.targetTabId as number;
  }

  // Check if the popup window is still open (SW may have restarted while popup was open)
  if (session.popupWindowId) {
    try {
      await chrome.windows.get(session.popupWindowId as number);
      popupWindowId = session.popupWindowId as number;
      // Restore debugger connections that were active before SW restart
      const targets = await chrome.debugger.getTargets();
      for (const t of targets) {
        if (t.tabId != null && t.attached) attachedTabs.add(t.tabId);
      }
      // Re-attach to target if needed
      if (filterUrl && targetTabId != null && !attachedTabs.has(targetTabId)) {
        await tryAttachTab(targetTabId);
      }
    } catch {
      popupWindowId = undefined;
      await chrome.storage.session.set({ popupWindowId: null });
    }
  }

  // If no target tab yet, pick the active tab in the focused normal window
  if (targetTabId == null) {
    const [active] = await chrome.tabs.query({ active: true, windowType: 'normal' });
    targetTabId = active?.id;
    if (targetTabId != null) await chrome.storage.session.set({ targetTabId });
  }

  console.log(
    `[RF:sw] restored: filter="${filterUrl}" target=${targetTabId} attached=${[...attachedTabs].toString()} cdpKeys=${cdpKeyToEntry.size}`,
  );
})();

async function saveCdpMaps(): Promise<void> {
  await chrome.storage.session.set({
    cdpMap: Object.fromEntries(cdpKeyToEntry),
    entryMap: Object.fromEntries(entryToCdp),
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[RF:sw] fresh install, initialising storage');
    void chrome.storage.local.set({ filterUrl: '', entries: [] });
  } else {
    console.log('[RF:sw] extension updated/reloaded, clearing in-flight entries');
    chrome.storage.local.get('entries', (r) => {
      const existing: StoredEntry[] = (r.entries as StoredEntry[]) ?? [];
      const cleaned = existing.filter(
        (e) => e.status !== 'pending' && e.status !== 'response_pending',
      );
      void chrome.storage.local.set({ entries: cleaned });
    });
  }
});

// ── Track active tab (only normal browser windows, not our popup) ─────────────

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void (async () => {
    try {
      const win = await chrome.windows.get(windowId);
      if (win.type !== 'normal') return;

      const prevTarget = targetTabId;
      targetTabId = tabId;
      await chrome.storage.session.set({ targetTabId });

      // Only switch debugger if popup is open and filter is active
      if (!filterUrl || popupWindowId == null) return;

      // Detach from the previous target tab
      if (prevTarget != null && prevTarget !== tabId && attachedTabs.has(prevTarget)) {
        await tryDetachTab(prevTarget);
      }
      // Attach to the new target tab
      if (!attachedTabs.has(tabId)) {
        await tryAttachTab(tabId);
      }
    } catch (e) {
      console.warn('[RF:sw] onActivated error:', e);
    }
  })();
});

// ── Filter changes ────────────────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.filterUrl) return;
  filterUrl = (changes.filterUrl.newValue as string) || '';

  // Only act on filter changes while popup is open
  if (popupWindowId == null) return;

  void (async () => {
    if (filterUrl) {
      // Attach to target if not yet attached, otherwise just update patterns
      if (targetTabId != null) {
        if (!attachedTabs.has(targetTabId)) {
          await tryAttachTab(targetTabId);
        } else {
          try {
            await enableFetch(targetTabId);
          } catch (e) {
            console.warn(`[RF:sw] enableFetch update failed for tab ${targetTabId}:`, e);
          }
        }
      }
    } else {
      // Filter cleared — disable interception but KEEP debugger attached
      // (re-attaching on next filter change would show the banner again)
      for (const tabId of [...attachedTabs]) {
        try {
          await chrome.debugger.sendCommand({ tabId }, 'Fetch.disable', {});
        } catch (e) {
          console.warn(`[RF:sw] Fetch.disable failed for tab ${tabId}:`, e);
        }
      }
    }
  })();
});

// ── Tab management ────────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;
  if (tabId !== targetTabId) return;
  // Clean up in-flight entries that won't resolve after navigation.
  // Re-attach is handled inside onDetach (Chrome fires it on navigation).
  void cleanupTabEntries(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === targetTabId) targetTabId = undefined;
  attachedTabs.delete(tabId);
  void cleanupTabMaps(tabId);
});

chrome.debugger.onDetach.addListener((source, reason) => {
  const tabId = source.tabId;
  if (tabId == null) return;
  attachedTabs.delete(tabId);

  if (reason === 'canceled_by_user') {
    // User explicitly closed the debugging banner — respect it, do NOT re-attach
    void cleanupTabMaps(tabId);
    console.log(`[RF:sw] debugging dismissed by user for tab ${tabId}`);
    return;
  }

  // reason === 'target_closed': navigation caused Chrome to close the old page target.
  // Re-attach if the tab still exists (i.e. it's navigation, not a tab close).
  void (async () => {
    await cleanupTabMaps(tabId);
    if (tabId !== targetTabId || !filterUrl || popupWindowId == null) return;
    try {
      await chrome.tabs.get(tabId); // throws if tab is truly gone
      await tryAttachTab(tabId);
    } catch {
      // Tab was closed — nothing to do
    }
  })();
});

// ── Debugger attachment ───────────────────────────────────────────────────────

async function tryAttachTab(tabId: number): Promise<void> {
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    await enableFetch(tabId);
    attachedTabs.add(tabId);
    console.log(`[RF:sw] attached debugger to tab ${tabId}`);
  } catch (e) {
    console.warn(`[RF:sw] cannot attach to tab ${tabId}:`, e);
  }
}

async function tryDetachTab(tabId: number): Promise<void> {
  try {
    await chrome.debugger.detach({ tabId });
  } catch {
    // Ignore — tab may already be closed
  }
  attachedTabs.delete(tabId);
  await cleanupTabMaps(tabId);
}

async function enableFetch(tabId: number): Promise<void> {
  const patterns = filterUrl
    ? [
        { urlPattern: `*${escapeGlob(filterUrl)}*`, requestStage: 'Request' },
        { urlPattern: `*${escapeGlob(filterUrl)}*`, requestStage: 'Response' },
      ]
    : [];
  await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', { patterns });
}

// Fetch.RequestPattern.urlPattern uses glob syntax: * = any chars, ? = one char, \ = escape
function escapeGlob(s: string): string {
  return s.replace(/[*?\\]/g, '\\$&');
}

// ── CDP event handling ────────────────────────────────────────────────────────

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method !== 'Fetch.requestPaused') return;
  const tabId = source.tabId;
  if (tabId == null) return;

  const p = params as {
    requestId: string;
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
      p.request,
      p.responseStatusCode,
      p.responseHeaders ?? [],
    );
  } else {
    void handleRequestPaused(tabId, p.requestId, p.request);
  }
});

async function handleRequestPaused(
  tabId: number,
  cdpRequestId: string,
  request: { url: string; method: string; headers: Record<string, string>; postData?: string },
): Promise<void> {
  // Auto-continue CORS preflight requests
  if (request.method === 'OPTIONS') {
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
        requestId: cdpRequestId,
      });
    } catch (e) {
      console.warn('[RF:sw] continueRequest (OPTIONS) failed:', e);
    }
    return;
  }

  const id = crypto.randomUUID();
  const cdpKey = `${tabId}:${cdpRequestId}`;
  cdpKeyToEntry.set(cdpKey, id);
  entryToCdp.set(id, { tabId, cdpRequestId });
  await saveCdpMaps();

  const entry: StoredEntry = {
    id,
    timestamp: Date.now(),
    method: request.method,
    url: request.url,
    requestHeaders: request.headers,
    requestBody: request.postData,
    status: 'pending',
    tabId,
  };

  await upsertEntry(entry);
  console.log(`[RF:sw] request paused tab=${tabId} cdpId=${cdpRequestId} entryId=${id}`);
}

async function handleResponsePaused(
  tabId: number,
  cdpRequestId: string,
  request: { url: string },
  statusCode: number,
  responseHeaders: Array<{ name: string; value: string }>,
): Promise<void> {
  const cdpKey = `${tabId}:${cdpRequestId}`;
  const entryId = cdpKeyToEntry.get(cdpKey);

  if (!entryId) {
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
        requestId: cdpRequestId,
      });
    } catch (e) {
      console.warn('[RF:sw] continueResponse (untracked) failed:', e);
    }
    return;
  }

  let responseBody: string | undefined;
  try {
    const bodyResult = (await chrome.debugger.sendCommand({ tabId }, 'Fetch.getResponseBody', {
      requestId: cdpRequestId,
    })) as { body: string; base64Encoded: boolean };
    responseBody = bodyResult.base64Encoded ? atob(bodyResult.body) : bodyResult.body;
  } catch (e) {
    console.warn(`[RF:sw] getResponseBody failed for ${entryId}:`, e);
  }

  await patchEntry(entryId, {
    status: 'response_pending',
    responseStatus: statusCode,
    responseHeaders: headersArrayToObject(responseHeaders),
    responseBody,
  });
  console.log(
    `[RF:sw] response paused tab=${tabId} entryId=${entryId} status=${statusCode} url=${request.url}`,
  );
}

// ── Popup messages ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: PopupToWorker, _sender, sendResponse) => {
  void (async () => {
    if (msg.type === 'PROCEED') {
      await handleProceed(msg);
    } else if (msg.type === 'APPLY_RESPONSE') {
      await handleApplyResponse(msg);
    }
    sendResponse({ ok: true });
  })();
  return true;
});

async function handleProceed(msg: Extract<PopupToWorker, { type: 'PROCEED' }>): Promise<void> {
  const { entry, editedBody } = msg;
  const cdpInfo = entryToCdp.get(entry.id);
  if (!cdpInfo) {
    console.warn(`[RF:sw] PROCEED: no CDP info for entry ${entry.id}`);
    return;
  }

  const { tabId, cdpRequestId } = cdpInfo;
  const body = editedBody ?? entry.requestBody;
  const continueParams: Record<string, unknown> = { requestId: cdpRequestId };
  // CDP Fetch.continueRequest.postData must be base64-encoded
  if (body !== undefined) {
    continueParams.postData = stringToBase64(body);
  }

  try {
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', continueParams);
    await patchEntry(entry.id, {
      status: 'sent',
      requestBody: body ?? entry.requestBody,
    });
    console.log(`[RF:sw] continued request tab=${tabId} entryId=${entry.id}`);
  } catch (e) {
    console.error('[RF:sw] continueRequest failed:', e);
  }
}

async function handleApplyResponse(
  msg: Extract<PopupToWorker, { type: 'APPLY_RESPONSE' }>,
): Promise<void> {
  const { entryId, editedBody } = msg;
  const cdpInfo = entryToCdp.get(entryId);
  if (!cdpInfo) {
    console.warn(`[RF:sw] APPLY_RESPONSE: no CDP info for entry ${entryId}`);
    return;
  }

  const { tabId, cdpRequestId } = cdpInfo;

  const result = await chrome.storage.local.get('entries');
  const entries: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return;

  const finalBody = editedBody ?? entry.responseBody ?? '';
  const statusCode = entry.responseStatus ?? 200;
  const cdpHeaders = Object.entries(entry.responseHeaders ?? {}).map(([name, value]) => ({
    name,
    value: String(value),
  }));

  try {
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.fulfillRequest', {
      requestId: cdpRequestId,
      responseCode: statusCode,
      responseHeaders: cdpHeaders,
      body: stringToBase64(finalBody),
    });
    await patchEntry(entryId, { status: 'complete', responseBody: finalBody });
    console.log(`[RF:sw] fulfilled response tab=${tabId} entryId=${entryId}`);
  } catch (e) {
    console.error('[RF:sw] fulfillRequest failed:', e);
  }

  cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
  entryToCdp.delete(entryId);
  await saveCdpMaps();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function headersArrayToObject(
  headers: Array<{ name: string; value: string }>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const { name, value } of headers) {
    const key = name.toLowerCase();
    result[key] = result[key] ? `${result[key]}, ${value}` : value;
  }
  return result;
}

function stringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

async function cleanupTabEntries(tabId: number): Promise<void> {
  const result = await chrome.storage.local.get('entries');
  const entries: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
  const cleaned = entries.filter(
    (e) => !(e.tabId === tabId && (e.status === 'pending' || e.status === 'response_pending')),
  );
  if (cleaned.length !== entries.length) {
    await chrome.storage.local.set({ entries: cleaned });
    console.log(`[RF:sw] cleared in-flight entries for tab ${tabId} (navigation)`);
  }
  await cleanupTabMaps(tabId);
}

async function cleanupTabMaps(tabId: number): Promise<void> {
  for (const [key, entryId] of cdpKeyToEntry) {
    if (key.startsWith(`${tabId}:`)) {
      cdpKeyToEntry.delete(key);
      entryToCdp.delete(entryId);
    }
  }
  await saveCdpMaps();
}

async function upsertEntry(entry: StoredEntry): Promise<void> {
  const result = await chrome.storage.local.get('entries');
  const existing: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
  const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, 100);
  await chrome.storage.local.set({ entries: updated });
}

async function patchEntry(id: string, patch: Partial<StoredEntry>): Promise<void> {
  const result = await chrome.storage.local.get('entries');
  const existing: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
  if (!existing.some((e) => e.id === id)) {
    console.warn(`[RF:sw] patchEntry: id=${id} not found`);
    return;
  }
  await chrome.storage.local.set({
    entries: existing.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  });
}
