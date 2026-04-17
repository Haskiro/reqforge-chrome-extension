import type { StoredEntry } from '@/types';

import { findBackgroundMods, hasInteractiveMatch } from '../shared/rule-matcher';
import { base64ToString, headersArrayToObject, stringToBase64 } from './helpers';
import { replaySkipUrls } from './state';
import { cachedRules, cdpKeyToEntry, entryToCdp, networkToEntry, popupWindowId } from './state';
import { saveCdpMaps, upsertEntry } from './storage-queue';

const replaySkipRequestIds = new Set<string>();

export const handleRequestPaused = async (
  tabId: number,
  cdpRequestId: string,
  networkId: string | null,
  request: { url: string; method: string; headers: Record<string, string>; postData?: string },
): Promise<void> => {
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
};

export const handleResponsePaused = async (
  tabId: number,
  cdpRequestId: string,
  url: string,
  method: string,
  statusCode: number,
  responseHeaders: Array<{ name: string; value: string }>,
): Promise<void> => {
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
        // body stays empty
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
};
