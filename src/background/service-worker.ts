import type { Rule, StoredEntry } from '@/types';

import type { PopupToWorker, RepeatResponse } from '../shared/messages';
import { findBackgroundMods, hasInteractiveMatch } from '../shared/rule-matcher';

// ── Window management ─────────────────────────────────────────────────────────

let popupWindowId: number | undefined;

const hasEnabledBackgroundRules = (): boolean =>
  cachedRules.some((r) => r.enabled && r.mode === 'background');

const hasEnabledInteractiveRules = (): boolean =>
  cachedRules.some((r) => r.enabled && r.mode === 'interactive');

const shouldIntercept = (): boolean => hasEnabledBackgroundRules() || hasEnabledInteractiveRules();

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
      height: 710,
      focused: true,
    });
    popupWindowId = win?.id;
    await chrome.storage.session.set({ popupWindowId: win?.id });
    await chrome.storage.local.set({ entries: [] });

    if (targetTabId != null && !attachedTabs.has(targetTabId)) {
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
  // Disable all rules so they start inactive on next popup open
  const stored = await chrome.storage.local.get('rulesState');
  const rulesState = stored.rulesState as { rules: Rule[] } | null;
  if (rulesState?.rules?.length) {
    await chrome.storage.local.set({
      rulesState: { ...rulesState, rules: rulesState.rules.map((r) => ({ ...r, enabled: false })) },
    });
  }
  cachedRules = [];
}

// ── CDP state ─────────────────────────────────────────────────────────────────
// Maps are persisted to chrome.storage.session so they survive SW restarts.

const attachedTabs = new Set<number>();
// `${tabId}:${cdpRequestId}` → entryId
const cdpKeyToEntry = new Map<string, string>();
// entryId → { tabId, cdpRequestId }
const entryToCdp = new Map<string, { tabId: number; cdpRequestId: string }>();
// Network.RequestId → entryId (for detecting cancelled requests)
const networkToEntry = new Map<string, string>();

// The single tab we're currently intercepting
let targetTabId: number | undefined;

let cachedRules: Rule[] = [];

// ── Startup: restore state from storage ──────────────────────────────────────

void (async () => {
  const local = await chrome.storage.local.get(['rulesState']);
  cachedRules = (local.rulesState as { rules: Rule[] } | null)?.rules ?? [];

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
      if (targetTabId != null && !attachedTabs.has(targetTabId)) {
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

// ── Track active tab (only normal browser windows, not our popup) ─────────────

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void (async () => {
    try {
      const win = await chrome.windows.get(windowId);
      if (win.type !== 'normal') return;

      const prevTarget = targetTabId;
      targetTabId = tabId;
      await chrome.storage.session.set({ targetTabId });

      // Only switch debugger if popup is open and there is something to intercept
      if (!shouldIntercept() || popupWindowId == null) return;

      // Don't detach from the previous tab if it still has pending requests —
      // detaching would cause Chrome to auto-resume them before the user handles them.
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
  if (area !== 'local') return;
  if (changes.rulesState) {
    cachedRules = (changes.rulesState.newValue as { rules: Rule[] } | null)?.rules ?? [];
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
    void cleanupTabMaps(tabId);
    void chrome.runtime.sendMessage({ type: 'DEBUGGER_DETACHED' });
    return;
  }

  // reason === 'target_closed': navigation caused Chrome to close the old page target.
  // Re-attach if the tab still exists (i.e. it's navigation, not a tab close).
  void (async () => {
    await cleanupTabMaps(tabId);
    if (tabId !== targetTabId || popupWindowId == null) return;
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
    await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {});
    await enableFetch(tabId);
    attachedTabs.add(tabId);
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

function ruleToGlobPattern(rule: Rule): string {
  switch (rule.ruleType) {
    case 'CONTAINS':
      return `*${escapeGlob(rule.value)}*`;
    case 'EQUALS':
      return escapeGlob(rule.value);
    case 'REGEX':
      return rule.value;
  }
}

async function enableFetch(tabId: number): Promise<void> {
  const patterns: Array<{ urlPattern: string; requestStage: string }> = [];

  for (const rule of cachedRules) {
    if (!rule.enabled) continue;
    const urlPattern = ruleToGlobPattern(rule);
    const needsRequest = rule.direction === 'REQUEST' || rule.direction === 'ANY';
    const needsResponse = rule.direction === 'RESPONSE' || rule.direction === 'ANY';
    if (needsRequest) patterns.push({ urlPattern, requestStage: 'Request' });
    if (needsResponse) patterns.push({ urlPattern, requestStage: 'Response' });
  }

  await chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', { patterns });
}

// Fetch.RequestPattern.urlPattern uses glob syntax: * = any chars, ? = one char, \ = escape
function escapeGlob(s: string): string {
  return s.replace(/[*?\\]/g, '\\$&');
}

// ── CDP event handling ────────────────────────────────────────────────────────

chrome.debugger.onEvent.addListener((source, method, params) => {
  const tabId = source.tabId;
  if (tabId == null) return;

  if (method === 'Network.loadingFailed') {
    const p = params as { requestId: string; canceled?: boolean };
    if (!p.canceled) return;
    const entryId = networkToEntry.get(p.requestId);
    if (!entryId) return;
    networkToEntry.delete(p.requestId);
    const cdpInfo = entryToCdp.get(entryId);
    if (cdpInfo) {
      cdpKeyToEntry.delete(`${cdpInfo.tabId}:${cdpInfo.cdpRequestId}`);
      entryToCdp.delete(entryId);
    }
    void deleteEntry(entryId);
    void saveCdpMaps();
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

async function handleRequestPaused(
  tabId: number,
  cdpRequestId: string,
  networkId: string | null,
  request: { url: string; method: string; headers: Record<string, string>; postData?: string },
): Promise<void> {
  // Auto-continue CORS preflight requests before anything else so they never
  // consume a replaySkipUrls count or get stored in traffic
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

  // Auto-continue replay requests without storing them in traffic
  if (replaySkipUrls.has(request.url)) {
    const remaining = (replaySkipUrls.get(request.url) ?? 1) - 1;
    if (remaining <= 0) replaySkipUrls.delete(request.url);
    else replaySkipUrls.set(request.url, remaining);
    replaySkipRequestIds.add(cdpRequestId);
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
      requestId: cdpRequestId,
    });
    return;
  }

  if (popupWindowId == null) {
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
      requestId: cdpRequestId,
    });
    return;
  }

  // Background rules — apply modifications and continue without stopping
  const bgRequestMods = findBackgroundMods(cachedRules, request.url, request.method, 'REQUEST');
  if (bgRequestMods.length > 0) {
    const headers = { ...request.headers };
    let url: string | undefined;
    let postData: string | undefined;
    for (const mod of bgRequestMods) {
      if (mod.type === 'ADD_HEADER' && mod.name) headers[mod.name] = mod.value;
      if (mod.type === 'REPLACE_BODY') postData = mod.value;
      if (mod.type === 'REPLACE_URL') url = mod.value;
    }
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
        requestId: cdpRequestId,
        headers: Object.entries(headers).map(([name, value]) => ({ name, value })),
        ...(url !== undefined && { url }),
        ...(postData !== undefined && { postData: stringToBase64(postData) }),
      });
    } catch (e) {
      console.warn('[RF:sw] continueRequest (background rule) failed:', e);
    }
    return;
  }

  // Interactive rules — auto-continue if no match
  if (!hasInteractiveMatch(cachedRules, request.url, request.method, 'REQUEST')) {
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
        requestId: cdpRequestId,
      });
    } catch (e) {
      console.warn('[RF:sw] continueRequest (no match) failed:', e);
    }
    return;
  }

  const id = crypto.randomUUID();
  const cdpKey = `${tabId}:${cdpRequestId}`;
  cdpKeyToEntry.set(cdpKey, id);
  entryToCdp.set(id, { tabId, cdpRequestId });
  if (networkId) networkToEntry.set(networkId, id);
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
}

async function handleResponsePaused(
  tabId: number,
  cdpRequestId: string,
  url: string,
  method: string,
  statusCode: number,
  responseHeaders: Array<{ name: string; value: string }>,
): Promise<void> {
  if (replaySkipRequestIds.has(cdpRequestId)) {
    replaySkipRequestIds.delete(cdpRequestId);
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
      requestId: cdpRequestId,
    });
    return;
  }

  if (popupWindowId == null) {
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
      requestId: cdpRequestId,
    });
    return;
  }

  const cdpKey = `${tabId}:${cdpRequestId}`;
  const entryId = cdpKeyToEntry.get(cdpKey);

  // Background rules — apply modifications and fulfill without stopping
  const bgResponseMods = findBackgroundMods(cachedRules, url, method, 'RESPONSE');
  if (bgResponseMods.length > 0) {
    const headers = headersArrayToObject(responseHeaders);
    let body = '';
    let finalStatus = statusCode;
    const hasBodyReplace = bgResponseMods.some((m) => m.type === 'REPLACE_BODY');
    if (!hasBodyReplace) {
      try {
        const r = (await chrome.debugger.sendCommand({ tabId }, 'Fetch.getResponseBody', {
          requestId: cdpRequestId,
        })) as { body: string; base64Encoded: boolean };
        body = r.base64Encoded ? atob(r.body) : r.body;
      } catch {
        // keep empty
      }
    }
    for (const mod of bgResponseMods) {
      if (mod.type === 'ADD_HEADER' && mod.name) headers[mod.name] = mod.value;
      if (mod.type === 'REPLACE_BODY') body = mod.value;
      if (mod.type === 'REPLACE_STATUS') finalStatus = parseInt(mod.value, 10) || finalStatus;
    }
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.fulfillRequest', {
        requestId: cdpRequestId,
        responseCode: finalStatus,
        responseHeaders: Object.entries(headers).map(([name, value]) => ({ name, value })),
        body: stringToBase64(body),
      });
    } catch (e) {
      console.warn('[RF:sw] fulfillRequest (background rule) failed:', e);
    }
    return;
  }

  // If no request-stage entry, check interactive rules for RESPONSE stage
  if (!entryId) {
    if (!hasInteractiveMatch(cachedRules, url, method, 'RESPONSE')) {
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
          requestId: cdpRequestId,
        });
      } catch (e) {
        console.warn('[RF:sw] continueResponse (untracked) failed:', e);
      }
      return;
    }

    // Create a new entry for response-only interactive match
    const id = crypto.randomUUID();
    cdpKeyToEntry.set(cdpKey, id);
    entryToCdp.set(id, { tabId, cdpRequestId });
    await saveCdpMaps();

    let responseBody: string | undefined;
    try {
      const bodyResult = (await chrome.debugger.sendCommand({ tabId }, 'Fetch.getResponseBody', {
        requestId: cdpRequestId,
      })) as { body: string; base64Encoded: boolean };
      responseBody = bodyResult.base64Encoded ? base64ToString(bodyResult.body) : bodyResult.body;
    } catch (e) {
      console.warn(`[RF:sw] getResponseBody failed for new entry ${id}:`, e);
    }

    const entry: StoredEntry = {
      id,
      timestamp: Date.now(),
      method,
      url,
      requestHeaders: {},
      status: 'response_pending',
      responseStatus: statusCode,
      responseHeaders: headersArrayToObject(responseHeaders),
      responseBody,
      tabId,
    };
    await upsertEntry(entry);
    return;
  }

  // If the rule direction is REQUEST-only, auto-continue the response
  if (!hasInteractiveMatch(cachedRules, url, method, 'RESPONSE')) {
    try {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
        requestId: cdpRequestId,
      });
    } catch (e) {
      console.warn('[RF:sw] continueResponse (request-only rule) failed:', e);
    }
    return;
  }

  let responseBody: string | undefined;
  try {
    const bodyResult = (await chrome.debugger.sendCommand({ tabId }, 'Fetch.getResponseBody', {
      requestId: cdpRequestId,
    })) as { body: string; base64Encoded: boolean };
    responseBody = bodyResult.base64Encoded ? base64ToString(bodyResult.body) : bodyResult.body;
  } catch (e) {
    console.warn(`[RF:sw] getResponseBody failed for response of ${entryId}:`, e);
  }

  // Create a separate response entry so the request entry stays visible as "Запрос"
  const responseId = crypto.randomUUID();
  const responseEntry: StoredEntry = {
    id: responseId,
    timestamp: Date.now(),
    method,
    url,
    requestHeaders: {},
    status: 'response_pending',
    responseStatus: statusCode,
    responseHeaders: headersArrayToObject(responseHeaders),
    responseBody,
    tabId,
  };
  await upsertEntry(responseEntry);

  cdpKeyToEntry.set(cdpKey, responseId);
  entryToCdp.delete(entryId);
  entryToCdp.set(responseId, { tabId, cdpRequestId });
  await saveCdpMaps();
}

// ── Message handler ───────────────────────────────────────────────────────────

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

// ── Keepalive (prevents SW from being killed while requests are paused) ───────

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'keepalive') return;
  port.onMessage.addListener(() => {});
});

// ── Popup messages ────────────────────────────────────────────────────────────

async function handleProceed(msg: Extract<PopupToWorker, { type: 'PROCEED' }>): Promise<void> {
  const { entry, editedUrl, editedMethod, editedHeaders, editedBody } = msg;
  const cdpInfo = entryToCdp.get(entry.id);
  if (!cdpInfo) {
    console.warn(`[RF:sw] PROCEED: no CDP info for entry ${entry.id}`);
    return;
  }

  const { tabId, cdpRequestId } = cdpInfo;
  const continueParams: Record<string, unknown> = { requestId: cdpRequestId };
  if (editedUrl !== undefined) continueParams.url = editedUrl;
  if (editedMethod !== undefined) continueParams.method = editedMethod;
  if (editedHeaders !== undefined) {
    const finalHeaders = { ...editedHeaders };
    for (const key of Object.keys(entry.requestHeaders ?? {})) {
      if (!(key in finalHeaders)) finalHeaders[key] = '';
    }
    continueParams.headers = Object.entries(finalHeaders).map(([name, value]) => ({ name, value }));
  }
  if (editedBody !== undefined) {
    continueParams.postData = stringToBase64(editedBody);
  }

  try {
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', continueParams);
  } catch (e) {
    console.error('[RF:sw] continueRequest failed:', e);
  }
  await deleteEntry(entry.id);
}

async function handleApplyResponse(
  msg: Extract<PopupToWorker, { type: 'APPLY_RESPONSE' }>,
): Promise<void> {
  const { entryId, editedBody, editedResponseHeaders, editedResponseStatus } = msg;
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

  try {
    const hasEdits = editedBody !== undefined || editedResponseHeaders !== undefined;
    if (hasEdits) {
      const statusCode = editedResponseStatus ?? entry.responseStatus ?? 200;
      const finalHeaders = editedResponseHeaders ?? entry.responseHeaders ?? {};
      const cdpHeaders = Object.entries(finalHeaders).map(([name, value]) => ({
        name,
        value: String(value),
      }));
      let bodyBase64: string;
      if (editedBody !== undefined) {
        bodyBase64 = stringToBase64(editedBody);
      } else {
        try {
          const r = (await chrome.debugger.sendCommand({ tabId }, 'Fetch.getResponseBody', {
            requestId: cdpRequestId,
          })) as { body: string; base64Encoded: boolean };
          bodyBase64 = r.base64Encoded ? r.body : stringToBase64(r.body);
        } catch {
          bodyBase64 = entry.responseBody ? stringToBase64(entry.responseBody) : stringToBase64('');
        }
      }
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.fulfillRequest', {
        requestId: cdpRequestId,
        responseCode: statusCode,
        responseHeaders: cdpHeaders,
        body: bodyBase64,
      });
    } else {
      await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
        requestId: cdpRequestId,
      });
    }
  } catch (e) {
    console.error('[RF:sw] fulfillRequest failed:', e);
  }
  await deleteEntry(entryId);
  cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
  entryToCdp.delete(entryId);
  await saveCdpMaps();
}

async function handleReject(msg: Extract<PopupToWorker, { type: 'REJECT' }>): Promise<void> {
  const { entryId } = msg;
  const cdpInfo = entryToCdp.get(entryId);
  if (!cdpInfo) {
    console.warn(`[RF:sw] REJECT: no CDP info for entry ${entryId}`);
    return;
  }

  const { tabId, cdpRequestId } = cdpInfo;
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Fetch.failRequest', {
      requestId: cdpRequestId,
      errorReason: 'Failed',
    });
  } catch (e) {
    console.error('[RF:sw] failRequest failed:', e);
  }
  await deleteEntry(entryId);
  cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
  entryToCdp.delete(entryId);
  await saveCdpMaps();
}

async function handleRejectMany(
  msg: Extract<PopupToWorker, { type: 'REJECT_MANY' }>,
): Promise<void> {
  const { entryIds } = msg;
  await Promise.all(
    entryIds.map(async (entryId) => {
      const cdpInfo = entryToCdp.get(entryId);
      if (!cdpInfo) return;
      const { tabId, cdpRequestId } = cdpInfo;
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Fetch.failRequest', {
          requestId: cdpRequestId,
          errorReason: 'Failed',
        });
      } catch (e) {
        console.error('[RF:sw] failRequest failed:', e);
      }
      cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
      entryToCdp.delete(entryId);
    }),
  );
  await deleteEntries(entryIds);
  await saveCdpMaps();
}

async function handleApplyResponseMany(
  msg: Extract<PopupToWorker, { type: 'APPLY_RESPONSE_MANY' }>,
): Promise<void> {
  const { entryIds } = msg;

  await Promise.all(
    entryIds.map(async (entryId) => {
      const cdpInfo = entryToCdp.get(entryId);
      if (!cdpInfo) return;
      const { tabId, cdpRequestId } = cdpInfo;

      try {
        await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueResponse', {
          requestId: cdpRequestId,
        });
      } catch (e) {
        console.error('[RF:sw] continueResponse failed:', e);
      }
      cdpKeyToEntry.delete(`${tabId}:${cdpRequestId}`);
      entryToCdp.delete(entryId);
    }),
  );
  await deleteEntries(entryIds);
  await saveCdpMaps();
}

async function handleProceedMany(
  msg: Extract<PopupToWorker, { type: 'PROCEED_MANY' }>,
): Promise<void> {
  const { entries } = msg;
  await Promise.all(
    entries.map(async (entry) => {
      const cdpInfo = entryToCdp.get(entry.id);
      if (!cdpInfo) return;
      const { tabId, cdpRequestId } = cdpInfo;
      // No editedBody in bulk proceed — let Chrome pass through original bytes untouched.
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Fetch.continueRequest', {
          requestId: cdpRequestId,
        });
      } catch (e) {
        console.error('[RF:sw] continueRequest failed:', e);
      }
    }),
  );
  await deleteEntries(entries.map((e) => e.id));
}

const FORBIDDEN_HEADERS = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
]);

const filterHeaders = (headers: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([k]) =>
        !FORBIDDEN_HEADERS.has(k.toLowerCase()) &&
        !k.toLowerCase().startsWith('proxy-') &&
        !k.toLowerCase().startsWith('sec-'),
    ),
  );

type FetchResult = { status: number; headers: Record<string, string>; body: string };

// URLs currently being replayed via tabFetch — CDP should auto-continue these without storing them
const replaySkipUrls = new Map<string, number>();
// CDP request IDs of replayed requests — responses should also be auto-continued
const replaySkipRequestIds = new Set<string>();

const tabFetch = async (
  tabId: number,
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
): Promise<FetchResult> => {
  const count = replaySkipUrls.get(url) ?? 0;
  replaySkipUrls.set(url, count + 1);
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (
        fetchUrl: string,
        fetchMethod: string,
        fetchHeaders: Record<string, string>,
        fetchBody: string | null,
      ): Promise<FetchResult> => {
        const init: RequestInit = { method: fetchMethod, headers: fetchHeaders };
        if (fetchBody && !['GET', 'HEAD'].includes(fetchMethod)) init.body = fetchBody;
        const r = await fetch(fetchUrl, init);
        const rb = await r.text();
        const rh: Record<string, string> = {};
        r.headers.forEach((v, k) => {
          rh[k] = v;
        });
        return { status: r.status, headers: rh, body: rb };
      },
      args: [url, method, headers, body ?? null],
    });
    const result = results[0].result;
    if (!result) throw new Error('executeScript returned no result');
    return result;
  } finally {
    const remaining = (replaySkipUrls.get(url) ?? 1) - 1;
    if (remaining <= 0) replaySkipUrls.delete(url);
    else replaySkipUrls.set(url, remaining);
  }
};

const swFetch = async (
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
): Promise<FetchResult> => {
  const init: RequestInit = { method, headers };
  if (body && !['GET', 'HEAD'].includes(method)) init.body = body;
  const r = await fetch(url, init);
  const rb = await r.text();
  const rh: Record<string, string> = {};
  r.headers.forEach((v, k) => {
    rh[k] = v;
  });
  return { status: r.status, headers: rh, body: rb };
};

async function handleRepeat(
  msg: Extract<PopupToWorker, { type: 'REPEAT' }>,
  sendResponse: (r: RepeatResponse) => void,
): Promise<void> {
  const url = msg.editedUrl ?? msg.entry.url;
  const method = msg.editedMethod ?? msg.entry.method;
  const rawHeaders = msg.editedHeaders ?? msg.entry.requestHeaders;
  const headers = filterHeaders(rawHeaders);
  const body = msg.editedBody ?? msg.entry.requestBody;

  try {
    let result: FetchResult;
    if (msg.entry.tabId != null && attachedTabs.has(msg.entry.tabId)) {
      try {
        result = await tabFetch(msg.entry.tabId, url, method, headers, body);
      } catch {
        result = await swFetch(url, method, headers, body);
      }
    } else {
      result = await swFetch(url, method, headers, body);
    }

    sendResponse({
      ok: true,
      status: result.status,
      headers: result.headers,
      body: result.body,
    });
  } catch (e) {
    sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
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

function base64ToString(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function cleanupTabEntries(tabId: number): Promise<void> {
  const result = await chrome.storage.local.get('entries');
  const entries: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
  const cleaned = entries.filter(
    (e) => !(e.tabId === tabId && (e.status === 'pending' || e.status === 'response_pending')),
  );
  if (cleaned.length !== entries.length) {
    await chrome.storage.local.set({ entries: cleaned });
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
  for (const [networkId, entryId] of networkToEntry) {
    const cdpInfo = entryToCdp.get(entryId);
    if (!cdpInfo || cdpInfo.tabId === tabId) networkToEntry.delete(networkId);
  }
  await saveCdpMaps();
}

// Serialise all storage mutations so concurrent requests don't overwrite each other
let storageQueue = Promise.resolve();

const enqueueStorage = (task: () => Promise<void>): Promise<void> => {
  storageQueue = storageQueue.then(task);
  return storageQueue;
};

async function upsertEntry(entry: StoredEntry): Promise<void> {
  return enqueueStorage(async () => {
    const result = await chrome.storage.local.get('entries');
    const existing: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, 100);
    await chrome.storage.local.set({ entries: updated });
  });
}

async function deleteEntry(id: string): Promise<void> {
  await deleteEntries([id]);
}

async function deleteEntries(ids: string[]): Promise<void> {
  return enqueueStorage(async () => {
    const idSet = new Set(ids);
    const result = await chrome.storage.local.get('entries');
    const existing: StoredEntry[] = (result.entries as StoredEntry[]) ?? [];
    await chrome.storage.local.set({ entries: existing.filter((e) => !idSet.has(e.id)) });
  });
}
